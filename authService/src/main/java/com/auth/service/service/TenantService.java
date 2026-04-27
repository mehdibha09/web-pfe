package com.auth.service.service;

import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.auth.service.domain.AuditLog;
import com.auth.service.domain.Session;
import com.auth.service.domain.Tenant;
import com.auth.service.domain.TenantStatus;
import com.auth.service.domain.User;
import com.auth.service.domain.UserRole;
import com.auth.service.exception.BadRequestException;
import com.auth.service.exception.ConflictException;
import com.auth.service.exception.ForbiddenException;
import com.auth.service.exception.NotFoundException;
import com.auth.service.exception.UnauthorizedException;
import com.auth.service.repository.AuditLogRepository;
import com.auth.service.repository.RoleRepository;
import com.auth.service.repository.SessionRepository;
import com.auth.service.repository.TenantRepository;
import com.auth.service.repository.UserRepository;
import com.auth.service.repository.UserRoleRepository;
import com.auth.service.web.dto.RoleResponse;
import com.auth.service.web.dto.TenantCreateRequest;
import com.auth.service.web.dto.TenantResponse;
import com.auth.service.web.dto.TenantUpdateRequest;
import com.auth.service.web.dto.UserResponse;

@Service
public class TenantService {
    private static final String TOKEN_TYPE = "Bearer";
    private static final String SUPER_ADMIN_ROLE = "super-admin";

    private final TenantRepository tenantRepository;
    private final SessionRepository sessionRepository;
    private final UserRoleRepository userRoleRepository;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final AuditLogRepository auditLogRepository;

    public TenantService(
            TenantRepository tenantRepository,
            SessionRepository sessionRepository,
            UserRoleRepository userRoleRepository,
                UserRepository userRepository,
                RoleRepository roleRepository,
            AuditLogRepository auditLogRepository
    ) {
        this.tenantRepository = tenantRepository;
        this.sessionRepository = sessionRepository;
        this.userRoleRepository = userRoleRepository;
            this.userRepository = userRepository;
            this.roleRepository = roleRepository;
        this.auditLogRepository = auditLogRepository;
    }

            @Transactional(readOnly = true)
            public List<UserResponse> listTenantUsers(String authorizationHeader, UUID tenantId) {
            User currentUser = requireCurrentUser(authorizationHeader);
            Tenant tenant = requireTenant(tenantId);
            ensureTenantAccess(currentUser, tenant);

            return userRepository.findByTenant_Id(tenant.getId())
                .stream()
                .map(user -> new UserResponse(
                    user.getId(),
                    user.getEmail(),
                    user.getStatus().name(),
                    user.getTenant().getId(),
                    user.getTenant().getName(),
                    user.getCreatedAt(),
                    user.getUpdatedAt()
                ))
                .toList();
            }

            @Transactional(readOnly = true)
            public List<RoleResponse> listTenantRoles(String authorizationHeader, UUID tenantId) {
            User currentUser = requireCurrentUser(authorizationHeader);
            Tenant tenant = requireTenant(tenantId);
            ensureTenantAccess(currentUser, tenant);

            return roleRepository.findByTenant_Id(tenant.getId())
                .stream()
                .map(role -> new RoleResponse(
                    role.getId(),
                    role.getName(),
                    role.getDescription(),
                    role.getTenant().getId(),
                    role.getCreatedAt(),
                    List.of()
                ))
                .toList();
            }

    @Transactional(readOnly = true)
    public List<TenantResponse> listTenants(String authorizationHeader) {
        User currentUser = requireCurrentUser(authorizationHeader);
        requireSuperAdmin(currentUser);

        return tenantRepository.findAll()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public TenantResponse getTenantById(String authorizationHeader, UUID tenantId) {
        User currentUser = requireCurrentUser(authorizationHeader);
        Tenant tenant = requireTenant(tenantId);

        if (!isSuperAdmin(currentUser) && !tenant.getId().equals(currentUser.getTenant().getId())) {
            throw new ForbiddenException("Tenant belongs to another scope");
        }

        return toResponse(tenant);
    }

    @Transactional
    public TenantResponse createTenant(String authorizationHeader, TenantCreateRequest request) {
        User currentUser = requireCurrentUser(authorizationHeader);
        requireSuperAdmin(currentUser);

        String tenantName = normalizeName(request.name());
        tenantRepository.findByNameIgnoreCase(tenantName)
                .ifPresent(existing -> {
                    throw new ConflictException("Tenant already exists");
                });

        Tenant tenant = new Tenant();
        tenant.setName(tenantName);
        tenant.setContactEmail(normalizeNullable(request.contactEmail()));
        tenant.setModeDeployment(normalizeNullable(request.modeDeployment()));
        tenant.setStatus(parseStatusOrDefault(request.status(), TenantStatus.ACTIVE));

        Tenant savedTenant = tenantRepository.save(tenant);
        writeAudit(currentUser, "TENANT_CREATE", "Tenant created", savedTenant.getId().toString());
        return toResponse(savedTenant);
    }

    @Transactional
    public TenantResponse updateTenant(String authorizationHeader, UUID tenantId, TenantUpdateRequest request) {
        User currentUser = requireCurrentUser(authorizationHeader);
        requireSuperAdmin(currentUser);

        Tenant tenant = requireTenant(tenantId);

        if (request.name() != null && !request.name().isBlank()) {
            String updatedName = normalizeName(request.name());
            if (!updatedName.equalsIgnoreCase(tenant.getName())) {
                tenantRepository.findByNameIgnoreCase(updatedName)
                        .ifPresent(existing -> {
                            throw new ConflictException("Tenant name already exists");
                        });
                tenant.setName(updatedName);
            }
        }

        if (request.contactEmail() != null) {
            tenant.setContactEmail(normalizeNullable(request.contactEmail()));
        }

        if (request.modeDeployment() != null) {
            tenant.setModeDeployment(normalizeNullable(request.modeDeployment()));
        }

        if (request.status() != null && !request.status().isBlank()) {
            tenant.setStatus(parseStatusOrDefault(request.status(), tenant.getStatus()));
        }

        Tenant savedTenant = tenantRepository.save(tenant);
        writeAudit(currentUser, "TENANT_UPDATE", "Tenant updated", savedTenant.getId().toString());
        return toResponse(savedTenant);
    }

    @Transactional
    public TenantResponse disableTenant(String authorizationHeader, UUID tenantId) {
        User currentUser = requireCurrentUser(authorizationHeader);
        requireSuperAdmin(currentUser);

        Tenant tenant = requireTenant(tenantId);
        tenant.setStatus(TenantStatus.DELETED);

        Tenant savedTenant = tenantRepository.save(tenant);
        writeAudit(currentUser, "TENANT_DELETE", "Tenant disabled", savedTenant.getId().toString());
        return toResponse(savedTenant);
    }

    private Tenant requireTenant(UUID tenantId) {
        return tenantRepository.findById(tenantId)
                .orElseThrow(() -> new NotFoundException("Tenant not found"));
    }

    private User requireCurrentUser(String authorizationHeader) {
        Session session = requireValidSession(authorizationHeader);
        return session.getUser();
    }

    private Session requireValidSession(String authorizationHeader) {
        String accessToken = extractBearerToken(authorizationHeader);
        Session session = sessionRepository.findByAccessToken(accessToken)
                .orElseThrow(() -> new UnauthorizedException("Invalid access token"));

        if (session.getRevokedAt() != null) {
            throw new UnauthorizedException("Session revoked");
        }

        if (session.getExpirationDate().isBefore(Instant.now())) {
            throw new UnauthorizedException("Access token expired");
        }

        return session;
    }

    private void requireSuperAdmin(User currentUser) {
        if (!isSuperAdmin(currentUser)) {
            throw new ForbiddenException("Super-admin privileges required");
        }
    }

    private void ensureTenantAccess(User currentUser, Tenant tenant) {
        if (!isSuperAdmin(currentUser) && !tenant.getId().equals(currentUser.getTenant().getId())) {
            throw new ForbiddenException("Tenant belongs to another scope");
        }
    }

    private boolean isSuperAdmin(User currentUser) {
        return userRoleRepository.findByUser_Id(currentUser.getId())
                .stream()
                .map(UserRole::getRole)
                .anyMatch(role -> role.getName() != null && role.getName().trim().equalsIgnoreCase(SUPER_ADMIN_ROLE));
    }

    private String extractBearerToken(String authorizationHeader) {
        if (authorizationHeader == null || authorizationHeader.isBlank()) {
            throw new UnauthorizedException("Missing Authorization header");
        }

        String prefix = TOKEN_TYPE + " ";
        if (!authorizationHeader.startsWith(prefix)) {
            throw new UnauthorizedException("Invalid Authorization header format");
        }

        String token = authorizationHeader.substring(prefix.length()).trim();
        if (token.isBlank()) {
            throw new UnauthorizedException("Missing access token");
        }
        return token;
    }

    private TenantStatus parseStatusOrDefault(String rawStatus, TenantStatus defaultValue) {
        if (rawStatus == null || rawStatus.isBlank()) {
            return defaultValue;
        }
        try {
            return TenantStatus.valueOf(rawStatus.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException exception) {
            throw new BadRequestException("Invalid tenant status");
        }
    }

    private String normalizeName(String value) {
        if (value == null || value.isBlank()) {
            throw new BadRequestException("Tenant name is required");
        }
        return value.trim();
    }

    private String normalizeNullable(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }

    private TenantResponse toResponse(Tenant tenant) {
        return new TenantResponse(
                tenant.getId(),
                tenant.getName(),
                tenant.getContactEmail(),
                tenant.getModeDeployment(),
                tenant.getStatus().name(),
                userRepository.countByTenant_Id(tenant.getId()),
                tenant.getCreatedAt(),
                tenant.getUpdatedAt()
        );
    }

    private void writeAudit(User currentUser, String action, String details, String resourceId) {
        AuditLog auditLog = new AuditLog();
        auditLog.setUser(currentUser);
        auditLog.setTenant(currentUser.getTenant());
        auditLog.setAction(action);
        auditLog.setDetails(details);
        auditLog.setResource("tenant");
        auditLog.setResourceId(resourceId);
        auditLogRepository.save(auditLog);
    }
}
