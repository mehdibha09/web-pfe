package com.auth.service.service;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import com.auth.service.domain.AuditLog;
import com.auth.service.domain.Permission;
import com.auth.service.domain.RolePermission;
import com.auth.service.domain.Session;
import com.auth.service.domain.User;
import com.auth.service.domain.UserRole;
import com.auth.service.exception.ForbiddenException;
import com.auth.service.exception.NotFoundException;
import com.auth.service.exception.UnauthorizedException;
import com.auth.service.repository.AuditLogRepository;
import com.auth.service.repository.PermissionRepository;
import com.auth.service.repository.RolePermissionRepository;
import com.auth.service.repository.SessionRepository;
import com.auth.service.repository.UserRoleRepository;
import com.auth.service.web.dto.permission.PermissionResponse;
import com.auth.service.web.dto.permission.PermissionUpdateRequest;

import jakarta.servlet.http.HttpServletRequest;

@Service
public class PermissionService {
    private static final String TOKEN_TYPE = "Bearer";

    private final PermissionRepository permissionRepository;
    private final RolePermissionRepository rolePermissionRepository;
    private final UserRoleRepository userRoleRepository;
    private final SessionRepository sessionRepository;
    private final AuditLogRepository auditLogRepository;

    public PermissionService(
            PermissionRepository permissionRepository,
            RolePermissionRepository rolePermissionRepository,
            UserRoleRepository userRoleRepository,
            SessionRepository sessionRepository,
            AuditLogRepository auditLogRepository) {
        this.permissionRepository = permissionRepository;
        this.rolePermissionRepository = rolePermissionRepository;
        this.userRoleRepository = userRoleRepository;
        this.sessionRepository = sessionRepository;
        this.auditLogRepository = auditLogRepository;
    }

    @Transactional(readOnly = true)
    public PermissionResponse getPermissionById(String authorizationHeader, UUID permissionId) {
        requireCurrentUser(authorizationHeader);
        Permission permission = permissionRepository.findById(permissionId)
                .orElseThrow(() -> new NotFoundException("Permission not found"));
        return toResponse(permission);
    }

    @Transactional(readOnly = true)
    public List<PermissionResponse> listPermissions(String authorizationHeader) {
        User currentUser = requireCurrentUser(authorizationHeader);
        return permissionRepository.findAll()
                .stream()
                .map(this::toResponse)
                .sorted((first, second) -> first.name().compareToIgnoreCase(second.name()))
                .toList();
    }

    @Transactional(readOnly = true)
    public Page<PermissionResponse> listPermissions(String authorizationHeader, Pageable pageable) {
        User currentUser = requireCurrentUser(authorizationHeader);
        if (pageable.getSort().isSorted()) {
            return permissionRepository.findAll(pageable).map(this::toResponse);
        }
        return permissionRepository.findAll(PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(),
                Sort.by(Sort.Direction.ASC, "name"))).map(this::toResponse);
    }

    @Transactional
    public PermissionResponse updatePermission(String authorizationHeader, UUID permissionId,
            PermissionUpdateRequest request) {
        User currentUser = requireCurrentUser(authorizationHeader);
        ensureCanManagePermissions(currentUser);
        Permission permission = permissionRepository.findById(permissionId)
                .orElseThrow(() -> new NotFoundException("Permission not found"));

        if (request.description() != null) {
            permission.setDescription(normalizeNullable(request.description()));
        }

        Permission updatedPermission = permissionRepository.save(permission);
        writeAudit(currentUser, "PERMISSION_UPDATE", "Permission updated", updatedPermission.getId().toString());
        return toResponse(updatedPermission);
    }

    private PermissionResponse toResponse(Permission permission) {
        return new PermissionResponse(
                permission.getId(),
                permission.getName(),
                permission.getDescription());
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

    private String normalizeNullable(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }

    private void ensureCanManagePermissions(User currentUser) {
        if (isSuperAdmin(currentUser) || (isPlatformTenantUser(currentUser) && hasManagePermission(currentUser))) {
            return;
        }
        throw new ForbiddenException("Only super-admins or platform-tenant admins can manage permissions");
    }

    private boolean hasManagePermission(User currentUser) {
        return userRoleRepository.findByUser_Id(currentUser.getId())
                .stream()
                .map(UserRole::getRole)
                .map(role -> rolePermissionRepository.findByRole_Id(role.getId()))
                .flatMap(List::stream)
                .map(RolePermission::getPermission)
                .anyMatch(permission -> permission.getName() != null
                        && (permission.getName().trim().equalsIgnoreCase("PERMISSION_MANAGE")
                                || permission.getName().trim().equalsIgnoreCase("USER_MANAGE")));
    }

    private boolean isPlatformTenantUser(User currentUser) {
        UUID platformTenantId = userRoleRepository.findByRole_NameIgnoreCase("super-admin")
                .stream()
                .findFirst()
                .map(userRole -> userRole.getUser().getTenant().getId())
                .orElse(null);
        return platformTenantId != null && platformTenantId.equals(currentUser.getTenant().getId());
    }

    private boolean isSuperAdmin(User currentUser) {
        return userRoleRepository.findByUser_Id(currentUser.getId())
                .stream()
                .map(UserRole::getRole)
                .anyMatch(role -> role.getName() != null && role.getName().trim().equalsIgnoreCase("super-admin"));
    }

    private void writeAudit(User currentUser, String action, String details, String resourceId) {
        AuditLog auditLog = new AuditLog();
        auditLog.setUser(currentUser);
        auditLog.setTenant(currentUser.getTenant());
        auditLog.setAction(action);
        auditLog.setDetails(details);
        auditLog.setResource("permission");
        auditLog.setResourceId(resourceId);
        auditLog.setIpAddress(resolveClientIp());
        auditLogRepository.save(auditLog);
    }

    private String resolveClientIp() {
        try {
            HttpServletRequest request = ((ServletRequestAttributes) RequestContextHolder.getRequestAttributes())
                    .getRequest();
            String forwardedFor = request.getHeader("X-Forwarded-For");
            if (forwardedFor != null && !forwardedFor.isBlank()) {
                return forwardedFor.split(",")[0].trim();
            }
            String realIp = request.getHeader("X-Real-IP");
            if (realIp != null && !realIp.isBlank()) {
                return realIp;
            }
            return request.getRemoteAddr();
        } catch (Exception e) {
            return null;
        }
    }
}
