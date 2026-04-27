package com.auth.auth.service;

import java.util.List;
import java.util.UUID;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.auth.auth.domain.AuditLog;
import com.auth.auth.domain.Role;
import com.auth.auth.domain.RolePermission;
import com.auth.auth.domain.Session;
import com.auth.auth.domain.User;
import com.auth.auth.domain.UserRole;
import com.auth.auth.domain.UserRoleId;
import com.auth.auth.domain.UserStatus;
import com.auth.auth.exception.BadRequestException;
import com.auth.auth.exception.ConflictException;
import com.auth.auth.exception.ForbiddenException;
import com.auth.auth.exception.NotFoundException;
import com.auth.auth.exception.UnauthorizedException;
import com.auth.auth.repository.AuditLogRepository;
import com.auth.auth.repository.RolePermissionRepository;
import com.auth.auth.repository.RoleRepository;
import com.auth.auth.repository.SessionRepository;
import com.auth.auth.repository.UserRepository;
import com.auth.auth.repository.UserRoleRepository;
import com.auth.auth.web.dto.AuthActionResponse;
import com.auth.auth.web.dto.RoleResponse;
import com.auth.auth.web.dto.UserAssignRoleRequest;
import com.auth.auth.web.dto.UserCreateRequest;
import com.auth.auth.web.dto.UserResponse;
import com.auth.auth.web.dto.UserUpdateRequest;
import com.auth.auth.web.dto.UserUpdateRolesRequest;

@Service
public class UserService {
    private static final String TOKEN_TYPE = "Bearer";

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final SessionRepository sessionRepository;
    private final UserRoleRepository userRoleRepository;
    private final RolePermissionRepository rolePermissionRepository;
    private final AuditLogRepository auditLogRepository;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    public UserService(
            UserRepository userRepository,
            RoleRepository roleRepository,
            SessionRepository sessionRepository,
            UserRoleRepository userRoleRepository,
            RolePermissionRepository rolePermissionRepository,
            AuditLogRepository auditLogRepository
    ) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.sessionRepository = sessionRepository;
        this.userRoleRepository = userRoleRepository;
        this.rolePermissionRepository = rolePermissionRepository;
        this.auditLogRepository = auditLogRepository;
    }

    @Transactional(readOnly = true)
    public List<RoleResponse> listUserRoles(String authorizationHeader, UUID userId) {
        User currentUser = requireCurrentUser(authorizationHeader);
        User user = requireUserInAllowedScope(userId, currentUser);

        return userRoleRepository.findByUser_Id(user.getId())
                .stream()
                .map(userRole -> userRole.getRole())
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
    public List<UserResponse> listUsers(String authorizationHeader) {
        User currentUser = requireCurrentUser(authorizationHeader);
        return (isSuperAdmin(currentUser)
                        ? userRepository.findAll()
                        : userRepository.findByTenant_Id(currentUser.getTenant().getId()))
                .stream()
                .filter(user -> isSuperAdmin(currentUser) || !hasSuperAdminRole(user))
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public UserResponse getUserById(String authorizationHeader, UUID userId) {
        User currentUser = requireCurrentUser(authorizationHeader);
        User user = requireUserInAllowedScope(userId, currentUser);
        return toResponse(user);
    }

    @Transactional
    public UserResponse createUser(String authorizationHeader, UserCreateRequest request) {
        User currentUser = requireCurrentUser(authorizationHeader);
        ensureCanManageUsers(currentUser);
        String email = normalizeEmail(request.email());

        userRepository.findByTenant_IdAndEmail(currentUser.getTenant().getId(), email)
                .ifPresent(existing -> {
                    throw new ConflictException("User email already exists in this tenant");
                });

        User user = new User();
        user.setTenant(currentUser.getTenant());
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(request.password()));
        user.setStatus(parseStatusOrDefault(request.status(), UserStatus.ACTIVE));

        User savedUser = userRepository.save(user);
        writeAudit(currentUser, "USER_CREATE", "User created", savedUser.getId().toString());
        return toResponse(savedUser);
    }

    @Transactional
    public UserResponse updateUser(String authorizationHeader, UUID userId, UserUpdateRequest request) {
        User currentUser = requireCurrentUser(authorizationHeader);
        ensureCanManageUsers(currentUser);
        User user = requireUserInAllowedScope(userId, currentUser);

        if (request.email() != null && !request.email().isBlank()) {
            String newEmail = normalizeEmail(request.email());
            if (!newEmail.equals(user.getEmail())) {
                userRepository.findByTenant_IdAndEmail(currentUser.getTenant().getId(), newEmail)
                        .ifPresent(existing -> {
                            throw new ConflictException("User email already exists in this tenant");
                        });
                user.setEmail(newEmail);
            }
        }

        if (request.password() != null && !request.password().isBlank()) {
            user.setPassword(passwordEncoder.encode(request.password()));
        }

        if (request.status() != null && !request.status().isBlank()) {
            user.setStatus(parseStatusOrDefault(request.status(), user.getStatus()));
        }

        User savedUser = userRepository.save(user);
        writeAudit(currentUser, "USER_UPDATE", "User updated", savedUser.getId().toString());
        return toResponse(savedUser);
    }

    @Transactional
    public AuthActionResponse deleteUser(String authorizationHeader, UUID userId) {
        User currentUser = requireCurrentUser(authorizationHeader);
        ensureCanManageUsers(currentUser);
        User user = requireUserInAllowedScope(userId, currentUser);

        if (user.getId().equals(currentUser.getId())) {
            throw new BadRequestException("You cannot delete your own account");
        }

        if (!isSuperAdmin(currentUser) && hasSuperAdminRole(user)) {
            throw new ForbiddenException("Super-admin account cannot be deleted");
        }

        user.setStatus(UserStatus.DELETED);
        userRepository.save(user);

        writeAudit(currentUser, "USER_DELETE", "User marked as deleted", user.getId().toString());
        return new AuthActionResponse("User deleted successfully");
    }

    @Transactional
    public AuthActionResponse assignRoleToUser(String authorizationHeader, UUID userId, UserAssignRoleRequest request) {
        User currentUser = requireCurrentUser(authorizationHeader);
        ensureCanManageUserRoles(currentUser);

        User user = requireUserInAllowedScope(userId, currentUser);
        var role = roleRepository.findById(request.roleId())
                .orElseThrow(() -> new NotFoundException("Role not found"));

        if (!isSuperAdmin(currentUser) && !role.getTenant().getId().equals(currentUser.getTenant().getId())) {
            throw new ForbiddenException("Role belongs to another tenant");
        }

        if (!isSuperAdmin(currentUser) && !user.getTenant().getId().equals(role.getTenant().getId())) {
            throw new ForbiddenException("Role and user must belong to the same tenant");
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

        writeAudit(currentUser, "USER_ASSIGN_ROLE", "Role assigned to user", user.getId().toString());
        return new AuthActionResponse("Role assigned to user");
    }

    @Transactional
    public AuthActionResponse removeRoleFromUser(String authorizationHeader, UUID userId, UUID roleId) {
        User currentUser = requireCurrentUser(authorizationHeader);
        ensureCanManageUserRoles(currentUser);

        User user = requireUserInAllowedScope(userId, currentUser);
        if (!isSuperAdmin(currentUser) && hasSuperAdminRole(user)) {
            throw new ForbiddenException("Cannot modify roles for super-admin accounts");
        }

        UserRoleId userRoleId = new UserRoleId(user.getId(), roleId);
        UserRole userRole = userRoleRepository.findById(userRoleId)
                .orElseThrow(() -> new NotFoundException("User-role assignment not found"));

        if (!isSuperAdmin(currentUser)
                && !userRole.getRole().getTenant().getId().equals(currentUser.getTenant().getId())) {
            throw new ForbiddenException("Role belongs to another tenant");
        }

        userRoleRepository.delete(userRole);
        writeAudit(currentUser, "USER_REMOVE_ROLE", "Role removed from user", user.getId().toString());
        return new AuthActionResponse("Role removed from user");
    }

    @Transactional
    public List<RoleResponse> replaceUserRoles(String authorizationHeader, UUID userId, UserUpdateRolesRequest request) {
        User currentUser = requireCurrentUser(authorizationHeader);
        ensureCanManageUserRoles(currentUser);

        User user = requireUserInAllowedScope(userId, currentUser);
        if (!isSuperAdmin(currentUser) && hasSuperAdminRole(user)) {
            throw new ForbiddenException("Cannot modify roles for super-admin accounts");
        }

        List<UUID> roleIds = request.roleIds() == null ? List.of() : request.roleIds().stream().distinct().toList();
        if (roleIds.size() > 1) {
            throw new BadRequestException("A user can only have one role");
        }

        List<Role> validatedRoles = roleIds.stream()
                .map(roleId -> roleRepository.findById(roleId)
                        .orElseThrow(() -> new NotFoundException("Role not found")))
                .toList();

        for (Role role : validatedRoles) {
            if (!isSuperAdmin(currentUser) && !role.getTenant().getId().equals(currentUser.getTenant().getId())) {
                throw new ForbiddenException("Role belongs to another tenant");
            }

            if (!isSuperAdmin(currentUser) && !user.getTenant().getId().equals(role.getTenant().getId())) {
                throw new ForbiddenException("Role and user must belong to the same tenant");
            }
        }

        List<UserRole> existingAssignments = userRoleRepository.findByUser_Id(user.getId());

        if (!existingAssignments.isEmpty()) {
            userRoleRepository.deleteAll(existingAssignments);
        }

        for (Role role : validatedRoles) {
            UserRole userRole = new UserRole();
            userRole.setId(new UserRoleId(user.getId(), role.getId()));
            userRole.setUser(user);
            userRole.setRole(role);
            userRoleRepository.save(userRole);
        }

        writeAudit(currentUser, "USER_REPLACE_ROLES", "User roles replaced", user.getId().toString());
        return listUserRoles(authorizationHeader, userId);
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

        if (session.getExpirationDate().isBefore(java.time.Instant.now())) {
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

    private User requireUserInAllowedScope(UUID userId, User currentUser) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("User not found"));

        if (!isSuperAdmin(currentUser) && !user.getTenant().getId().equals(currentUser.getTenant().getId())) {
            throw new ForbiddenException("User belongs to another tenant");
        }
        return user;
    }

    private boolean isSuperAdmin(User currentUser) {
        return hasSuperAdminRole(currentUser);
    }

    private boolean hasSuperAdminRole(User user) {
        return userRoleRepository.findByUser_Id(user.getId())
                .stream()
                .map(UserRole::getRole)
                .anyMatch(role -> role.getName() != null && role.getName().trim().equalsIgnoreCase("super-admin"));
    }

    private void ensureCanManageUsers(User currentUser) {
        if (isSuperAdmin(currentUser)) {
            return;
        }

        boolean canManageUsers = userRoleRepository.findByUser_Id(currentUser.getId())
                .stream()
                .map(UserRole::getRole)
                .map(role -> rolePermissionRepository.findByRole_Id(role.getId()))
                .flatMap(List::stream)
                .map(RolePermission::getPermission)
                .anyMatch(permission -> permission.getName() != null
                        && permission.getName().trim().equalsIgnoreCase("USER_MANAGE"));

        if (!canManageUsers) {
            throw new ForbiddenException("User management permission required");
        }
    }

    private void ensureCanManageUserRoles(User currentUser) {
        if (isSuperAdmin(currentUser)) {
            return;
        }

        boolean canManageUserRoles = userRoleRepository.findByUser_Id(currentUser.getId())
                .stream()
                .map(UserRole::getRole)
                .map(role -> rolePermissionRepository.findByRole_Id(role.getId()))
                .flatMap(List::stream)
                .map(RolePermission::getPermission)
                .anyMatch(permission -> permission.getName() != null && (
                        permission.getName().trim().equalsIgnoreCase("USER_MANAGE")
                                || permission.getName().trim().equalsIgnoreCase("ROLE_MANAGE")
                ));

        if (!canManageUserRoles) {
            throw new ForbiddenException("User role management permission required");
        }
    }

    private UserStatus parseStatusOrDefault(String rawStatus, UserStatus defaultValue) {
        if (rawStatus == null || rawStatus.isBlank()) {
            return defaultValue;
        }
        try {
            return UserStatus.valueOf(rawStatus.trim().toUpperCase());
        } catch (IllegalArgumentException exception) {
            throw new BadRequestException("Invalid user status");
        }
    }

    private String normalizeEmail(String email) {
        if (email == null || email.isBlank()) {
            throw new BadRequestException("Email is required");
        }
        return email.trim().toLowerCase();
    }

    private UserResponse toResponse(User user) {
        return new UserResponse(
                user.getId(),
                user.getEmail(),
                user.getStatus().name(),
                user.getTenant().getId(),
                user.getTenant().getName(),
                user.getCreatedAt(),
                user.getUpdatedAt()
        );
    }

    private void writeAudit(User currentUser, String action, String details, String resourceId) {
        AuditLog auditLog = new AuditLog();
        auditLog.setUser(currentUser);
        auditLog.setTenant(currentUser.getTenant());
        auditLog.setAction(action);
        auditLog.setDetails(details);
        auditLog.setResource("user");
        auditLog.setResourceId(resourceId);
        auditLogRepository.save(auditLog);
    }
}
