package com.auth.service.service;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.auth.service.domain.AuditLog;
import com.auth.service.domain.Permission;
import com.auth.service.domain.RolePermission;
import com.auth.service.domain.Session;
import com.auth.service.domain.User;
import com.auth.service.domain.UserRole;
import com.auth.service.exception.ConflictException;
import com.auth.service.exception.ForbiddenException;
import com.auth.service.exception.NotFoundException;
import com.auth.service.exception.UnauthorizedException;
import com.auth.service.repository.AuditLogRepository;
import com.auth.service.repository.PermissionRepository;
import com.auth.service.repository.RolePermissionRepository;
import com.auth.service.repository.SessionRepository;
import com.auth.service.repository.UserRoleRepository;
import com.auth.service.web.dto.AuthActionResponse;
import com.auth.service.web.dto.PermissionCreateRequest;
import com.auth.service.web.dto.PermissionResponse;

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
            AuditLogRepository auditLogRepository
    ) {
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
        requireCurrentUser(authorizationHeader);
        return permissionRepository.findAll()
                .stream()
                .map(this::toResponse)
                .sorted((first, second) -> first.name().compareToIgnoreCase(second.name()))
                .toList();
    }

    @Transactional
    public PermissionResponse createPermission(String authorizationHeader, PermissionCreateRequest request) {
        User currentUser = requireCurrentUser(authorizationHeader);
        ensureCanManagePermissions(currentUser);
        String permissionName = request.name().trim();

        permissionRepository.findByName(permissionName)
                .ifPresent(existing -> {
                    throw new ConflictException("Permission already exists");
                });

        Permission permission = new Permission();
        permission.setName(permissionName);
        permission.setDescription(normalizeNullable(request.description()));

        Permission savedPermission = permissionRepository.save(permission);
        writeAudit(currentUser, "PERMISSION_CREATE", "Permission created", savedPermission.getId().toString());
        return toResponse(savedPermission);
    }

    @Transactional
    public AuthActionResponse deletePermission(String authorizationHeader, UUID permissionId) {
        User currentUser = requireCurrentUser(authorizationHeader);
        ensureCanManagePermissions(currentUser);
        Permission permission = permissionRepository.findById(permissionId)
                .orElseThrow(() -> new NotFoundException("Permission not found"));

        List<RolePermission> rolePermissions = rolePermissionRepository.findByPermission_Id(permissionId);
        if (!rolePermissions.isEmpty()) {
            rolePermissionRepository.deleteAll(rolePermissions);
        }

        permissionRepository.delete(permission);
        writeAudit(currentUser, "PERMISSION_DELETE", "Permission deleted", permission.getId().toString());
        return new AuthActionResponse("Permission deleted successfully");
    }

    private PermissionResponse toResponse(Permission permission) {
        return new PermissionResponse(
                permission.getId(),
                permission.getName(),
                permission.getDescription()
        );
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
        if (isSuperAdmin(currentUser)) {
            return;
        }

        boolean canManagePermissions = userRoleRepository.findByUser_Id(currentUser.getId())
                .stream()
                .map(UserRole::getRole)
                .map(role -> rolePermissionRepository.findByRole_Id(role.getId()))
                .flatMap(List::stream)
                .map(RolePermission::getPermission)
                .anyMatch(permission -> permission.getName() != null
                        && permission.getName().trim().equalsIgnoreCase("PERMISSION_MANAGE"));

        if (!canManagePermissions) {
            throw new ForbiddenException("Permission management permission required");
        }
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
        auditLogRepository.save(auditLog);
    }
}
