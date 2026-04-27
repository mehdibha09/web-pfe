package com.auth.auth.service;

import java.util.List;
import java.util.Objects;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.auth.auth.domain.AuditLog;
import com.auth.auth.domain.Permission;
import com.auth.auth.domain.Role;
import com.auth.auth.domain.RolePermission;
import com.auth.auth.domain.RolePermissionId;
import com.auth.auth.domain.Session;
import com.auth.auth.domain.User;
import com.auth.auth.domain.UserRole;
import com.auth.auth.domain.UserRoleId;
import com.auth.auth.exception.BadRequestException;
import com.auth.auth.exception.ConflictException;
import com.auth.auth.exception.ForbiddenException;
import com.auth.auth.exception.NotFoundException;
import com.auth.auth.exception.UnauthorizedException;
import com.auth.auth.repository.AuditLogRepository;
import com.auth.auth.repository.PermissionRepository;
import com.auth.auth.repository.RolePermissionRepository;
import com.auth.auth.repository.RoleRepository;
import com.auth.auth.repository.SessionRepository;
import com.auth.auth.repository.UserRepository;
import com.auth.auth.repository.UserRoleRepository;
import com.auth.auth.web.dto.AuthActionResponse;
import com.auth.auth.web.dto.RoleAssignUserRequest;
import com.auth.auth.web.dto.RoleCreateRequest;
import com.auth.auth.web.dto.RolePermissionAssignRequest;
import com.auth.auth.web.dto.RoleResponse;
import com.auth.auth.web.dto.RoleUpdateRequest;

@Service
public class RoleService {
    private static final String TOKEN_TYPE = "Bearer";

    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final PermissionRepository permissionRepository;
    private final UserRoleRepository userRoleRepository;
    private final RolePermissionRepository rolePermissionRepository;
    private final SessionRepository sessionRepository;
    private final AuditLogRepository auditLogRepository;

    public RoleService(
            RoleRepository roleRepository,
            UserRepository userRepository,
            PermissionRepository permissionRepository,
            UserRoleRepository userRoleRepository,
            RolePermissionRepository rolePermissionRepository,
            SessionRepository sessionRepository,
            AuditLogRepository auditLogRepository
    ) {
        this.roleRepository = roleRepository;
        this.userRepository = userRepository;
        this.permissionRepository = permissionRepository;
        this.userRoleRepository = userRoleRepository;
        this.rolePermissionRepository = rolePermissionRepository;
        this.sessionRepository = sessionRepository;
        this.auditLogRepository = auditLogRepository;
    }

    @Transactional(readOnly = true)
    public List<RoleResponse> listRoles(String authorizationHeader) {
        User currentUser = requireCurrentUser(authorizationHeader);
        return (isSuperAdmin(currentUser)
            ? roleRepository.findAll()
            : roleRepository.findByTenant_Id(currentUser.getTenant().getId()))
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public RoleResponse createRole(String authorizationHeader, RoleCreateRequest request) {
        User currentUser = requireCurrentUser(authorizationHeader);
        ensureCanManageRoles(currentUser);
        String roleName = normalizeRoleName(request.name());

        roleRepository.findByTenant_IdAndName(currentUser.getTenant().getId(), roleName)
                .ifPresent(existing -> {
                    throw new ConflictException("Role already exists for this tenant");
                });

        Role role = new Role();
        role.setTenant(currentUser.getTenant());
        role.setName(roleName);
        role.setDescription(normalizeNullable(request.description()));

        Role savedRole = roleRepository.save(role);
        writeAudit(currentUser, "ROLE_CREATE", "Role created", savedRole.getId().toString());
        return toResponse(savedRole);
    }

    @Transactional
    public RoleResponse updateRole(String authorizationHeader, UUID roleId, RoleUpdateRequest request) {
        User currentUser = requireCurrentUser(authorizationHeader);
        ensureCanManageRoles(currentUser);
        Role role = requireRoleInAllowedScope(roleId, currentUser);

        if (request.name() != null && !request.name().isBlank()) {
            String updatedName = normalizeRoleName(request.name());
            if (!updatedName.equals(role.getName())) {
                roleRepository.findByTenant_IdAndName(currentUser.getTenant().getId(), updatedName)
                        .ifPresent(existing -> {
                            throw new ConflictException("Role name already used in this tenant");
                        });
                role.setName(updatedName);
            }
        }

        if (request.description() != null) {
            role.setDescription(normalizeNullable(request.description()));
        }

        Role savedRole = roleRepository.save(role);
        writeAudit(currentUser, "ROLE_UPDATE", "Role updated", savedRole.getId().toString());
        return toResponse(savedRole);
    }

    @Transactional
    public AuthActionResponse deleteRole(String authorizationHeader, UUID roleId) {
        User currentUser = requireCurrentUser(authorizationHeader);
        ensureCanManageRoles(currentUser);
        Role role = requireRoleInAllowedScope(roleId, currentUser);

        List<RolePermission> rolePermissions = rolePermissionRepository.findByRole_Id(role.getId());
        if (!rolePermissions.isEmpty()) {
            rolePermissionRepository.deleteAll(rolePermissions);
        }

        List<UserRole> userRoles = userRoleRepository.findByRole_Id(role.getId());
        if (!userRoles.isEmpty()) {
            userRoleRepository.deleteAll(userRoles);
        }

        roleRepository.delete(role);
        writeAudit(currentUser, "ROLE_DELETE", "Role deleted", role.getId().toString());
        return new AuthActionResponse("Role deleted successfully");
    }

    @Transactional
    public RoleResponse addPermissionToRole(
            String authorizationHeader,
            UUID roleId,
            RolePermissionAssignRequest request
    ) {
        User currentUser = requireCurrentUser(authorizationHeader);
        ensureCanManageRoles(currentUser);
        Role role = requireRoleInAllowedScope(roleId, currentUser);
        Permission permission = resolvePermission(request);

        RolePermissionId rolePermissionId = new RolePermissionId(role.getId(), permission.getId());
        if (rolePermissionRepository.existsById(rolePermissionId)) {
            throw new ConflictException("Permission already assigned to this role");
        }

        RolePermission rolePermission = new RolePermission();
        rolePermission.setId(rolePermissionId);
        rolePermission.setRole(role);
        rolePermission.setPermission(permission);
        rolePermissionRepository.save(rolePermission);

        writeAudit(currentUser, "ROLE_ADD_PERMISSION", "Permission added to role", role.getId().toString());
        return toResponse(role);
    }

    @Transactional
    public AuthActionResponse removePermissionFromRole(String authorizationHeader, UUID roleId, UUID permissionId) {
        User currentUser = requireCurrentUser(authorizationHeader);
        ensureCanManageRoles(currentUser);
        Role role = requireRoleInAllowedScope(roleId, currentUser);

        RolePermissionId rolePermissionId = new RolePermissionId(role.getId(), permissionId);
        RolePermission rolePermission = rolePermissionRepository.findById(rolePermissionId)
                .orElseThrow(() -> new NotFoundException("Permission assignment not found for this role"));

        rolePermissionRepository.delete(rolePermission);
        writeAudit(currentUser, "ROLE_REMOVE_PERMISSION", "Permission removed from role", role.getId().toString());
        return new AuthActionResponse("Permission removed from role");
    }

    @Transactional
    public AuthActionResponse assignUserToRole(String authorizationHeader, UUID roleId, RoleAssignUserRequest request) {
        User currentUser = requireCurrentUser(authorizationHeader);
        ensureCanManageRoles(currentUser);
        Role role = requireRoleInAllowedScope(roleId, currentUser);

        User user = userRepository.findById(request.userId())
                .orElseThrow(() -> new NotFoundException("User not found"));

        if (!isSuperAdmin(currentUser) && !user.getTenant().getId().equals(currentUser.getTenant().getId())) {
            throw new ForbiddenException("User belongs to another tenant");
        }

        if (!isSuperAdmin(currentUser) && hasSuperAdminRole(user)) {
            throw new ForbiddenException("Cannot modify roles for super-admin accounts");
        }

        List<UserRole> currentRoles = userRoleRepository.findByUser_Id(user.getId());
        if (currentRoles.stream().anyMatch(assignment -> assignment.getRole().getId().equals(role.getId()))) {
            throw new ConflictException("User already assigned to role");
        }

        if (!currentRoles.isEmpty()) {
            userRoleRepository.deleteAll(currentRoles);
        }

        UserRole userRole = new UserRole();
        userRole.setId(new UserRoleId(user.getId(), role.getId()));
        userRole.setUser(user);
        userRole.setRole(role);
        userRoleRepository.save(userRole);

        writeAudit(currentUser, "ROLE_ASSIGN_USER", "User assigned to role", role.getId().toString());
        return new AuthActionResponse("User assigned to role");
    }

    @Transactional
    public AuthActionResponse unassignUserFromRole(String authorizationHeader, UUID roleId, UUID userId) {
        User currentUser = requireCurrentUser(authorizationHeader);
        ensureCanManageRoles(currentUser);
        Role role = requireRoleInAllowedScope(roleId, currentUser);

        UserRoleId userRoleId = new UserRoleId(userId, role.getId());
        UserRole userRole = userRoleRepository.findById(userRoleId)
                .orElseThrow(() -> new NotFoundException("User-role assignment not found"));

        if (!isSuperAdmin(currentUser) && !userRole.getUser().getTenant().getId().equals(currentUser.getTenant().getId())) {
            throw new ForbiddenException("User belongs to another tenant");
        }

        if (!isSuperAdmin(currentUser) && hasSuperAdminRole(userRole.getUser())) {
            throw new ForbiddenException("Cannot modify roles for super-admin accounts");
        }

        userRoleRepository.delete(userRole);
        writeAudit(currentUser, "ROLE_UNASSIGN_USER", "User unassigned from role", role.getId().toString());
        return new AuthActionResponse("User unassigned from role");
    }

    private Role requireRoleInAllowedScope(UUID roleId, User currentUser) {
        Role role = roleRepository.findById(roleId)
                .orElseThrow(() -> new NotFoundException("Role not found"));

        if (!isSuperAdmin(currentUser) && !role.getTenant().getId().equals(currentUser.getTenant().getId())) {
            throw new ForbiddenException("Role belongs to another tenant");
        }
        return role;
    }

    private boolean isSuperAdmin(User currentUser) {
        return userRoleRepository.findByUser_Id(currentUser.getId())
                .stream()
                .map(UserRole::getRole)
                .anyMatch(role -> role.getName() != null && role.getName().trim().equalsIgnoreCase("super-admin"));
    }

    private boolean hasSuperAdminRole(User user) {
        return userRoleRepository.findByUser_Id(user.getId())
                .stream()
                .map(UserRole::getRole)
                .anyMatch(role -> role.getName() != null && role.getName().trim().equalsIgnoreCase("super-admin"));
    }

    private void ensureCanManageRoles(User currentUser) {
        if (isSuperAdmin(currentUser)) {
            return;
        }

        boolean canManageRoles = userRoleRepository.findByUser_Id(currentUser.getId())
                .stream()
                .map(UserRole::getRole)
                .map(role -> rolePermissionRepository.findByRole_Id(role.getId()))
                .flatMap(List::stream)
                .map(RolePermission::getPermission)
                .anyMatch(permission -> permission.getName() != null
                        && permission.getName().trim().equalsIgnoreCase("ROLE_MANAGE"));

        if (!canManageRoles) {
            throw new ForbiddenException("Role management permission required");
        }
    }

    private Permission resolvePermission(RolePermissionAssignRequest request) {
        if (request.permissionId() != null) {
            return permissionRepository.findById(request.permissionId())
                    .orElseThrow(() -> new NotFoundException("Permission not found"));
        }

        if (request.permissionName() == null || request.permissionName().isBlank()) {
            throw new BadRequestException("permissionId or permissionName is required");
        }

        String name = request.permissionName().trim();
        return permissionRepository.findByName(name)
                .orElseThrow(() -> new NotFoundException("Permission not found"));
    }

    private RoleResponse toResponse(Role role) {
        List<String> permissions = rolePermissionRepository.findByRole_Id(role.getId())
                .stream()
                .map(RolePermission::getPermission)
                .map(Permission::getName)
                .filter(Objects::nonNull)
                .distinct()
                .sorted()
                .toList();

        return new RoleResponse(
                role.getId(),
                role.getName(),
                role.getDescription(),
                role.getTenant().getId(),
                role.getCreatedAt(),
                permissions
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

    private String normalizeRoleName(String roleName) {
        if (roleName == null || roleName.isBlank()) {
            throw new BadRequestException("Role name is required");
        }
        return roleName.trim();
    }

    private String normalizeNullable(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }

    private void writeAudit(User currentUser, String action, String details, String resourceId) {
        AuditLog auditLog = new AuditLog();
        auditLog.setUser(currentUser);
        auditLog.setTenant(currentUser.getTenant());
        auditLog.setAction(action);
        auditLog.setDetails(details);
        auditLog.setResource("role");
        auditLog.setResourceId(resourceId);
        auditLogRepository.save(auditLog);
    }
}
