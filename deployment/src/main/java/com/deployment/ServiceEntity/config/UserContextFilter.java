package com.deployment.ServiceEntity.config;

import java.io.IOException;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class UserContextFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(UserContextFilter.class);
    private static final ObjectMapper mapper = new ObjectMapper();

    private static final List<String> PUBLIC_PREFIXES = List.of(
            "/api/v1/test",
            "/actuator"
    );

    private final AuthTokenResolver tokenResolver;
    private final IdentitySigner identitySigner;

    public UserContextFilter(AuthTokenResolver tokenResolver, IdentitySigner identitySigner) {
        this.tokenResolver = tokenResolver;
        this.identitySigner = identitySigner;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return PUBLIC_PREFIXES.stream().anyMatch(path::startsWith);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        try {
            String authHeader = request.getHeader("Authorization");
            String userIdHeader = request.getHeader("X-User-Id");
            String tenantIdHeader = request.getHeader("X-Tenant-Id");
            String permissionsHeader = request.getHeader("X-User-Permissions");
            String rolesHeader = request.getHeader("X-User-Roles");
            String signatureHeader = request.getHeader(IdentitySigner.SIGNATURE_HEADER);

            boolean signatureValid = identitySigner.verify(
                    signatureHeader, userIdHeader, tenantIdHeader, rolesHeader, permissionsHeader);

            if (userIdHeader != null && !"unknown".equals(userIdHeader) && !userIdHeader.isBlank()
                    && signatureValid) {
                UUID userId = UUID.fromString(userIdHeader);
                UUID tenantId = tenantIdHeader != null && !tenantIdHeader.isBlank()
                        ? UUID.fromString(tenantIdHeader) : null;
                Set<String> permissions = parsePermissionsHeader(permissionsHeader);
                Set<String> roles = parseRolesHeader(rolesHeader);
                UserContext.set(userId, tenantId, permissions, roles);
                chain.doFilter(request, response);
                return;
            }

            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                String token = authHeader.substring(7);
                var resolved = tokenResolver.resolve(token);
                if (resolved != null) {
                    Set<String> permissions = resolved.permissions() != null && !resolved.permissions().isEmpty()
                            ? resolved.permissions()
                            : parsePermissionsHeader(permissionsHeader);
                    UserContext.set(resolved.userId(), resolved.tenantId(), permissions, parseRolesHeader(rolesHeader));
                    chain.doFilter(request, response);
                    return;
                }
            }

            log.warn("No valid user context for {} {}", request.getMethod(), request.getRequestURI());
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Unauthorized: no valid user context");
        } catch (Exception e) {
            log.warn("Failed to set user context: {}", e.getMessage());
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Unauthorized: " + e.getMessage());
        } finally {
            UserContext.clear();
        }
    }

    private Set<String> parsePermissionsHeader(String header) {
        if (header == null || header.isBlank()) {
            return new HashSet<>();
        }
        try {
            return mapper.readValue(header, new TypeReference<Set<String>>() {});
        } catch (Exception e) {
            log.warn("Failed to parse X-User-Permissions header: {}", e.getMessage());
            return new HashSet<>();
        }
    }

    private Set<String> parseRolesHeader(String header) {
        if (header == null || header.isBlank()) {
            return new HashSet<>();
        }
        try {
            return mapper.readValue(header, new TypeReference<Set<String>>() {});
        } catch (Exception e) {
            log.warn("Failed to parse X-User-Roles header: {}", e.getMessage());
            return new HashSet<>();
        }
    }
}