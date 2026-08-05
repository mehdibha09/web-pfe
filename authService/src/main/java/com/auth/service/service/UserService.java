package com.auth.service.service;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import com.auth.service.domain.AuditLog;
import com.auth.service.domain.Role;
import com.auth.service.domain.RolePermission;
import com.auth.service.domain.Session;
import com.auth.service.domain.User;
import com.auth.service.domain.UserRole;
import com.auth.service.domain.UserRoleId;
import com.auth.service.domain.UserStatus;
import com.auth.service.exception.BadRequestException;
import com.auth.service.exception.ConflictException;
import com.auth.service.exception.ForbiddenException;
import com.auth.service.exception.NotFoundException;
import com.auth.service.exception.UnauthorizedException;
import com.auth.service.repository.AuditLogRepository;
import com.auth.service.repository.RolePermissionRepository;
import com.auth.service.repository.RoleRepository;
import com.auth.service.repository.SessionRepository;
import com.auth.service.repository.UserRepository;
import com.auth.service.repository.UserRoleRepository;
import com.auth.service.web.dto.auth.AuthActionResponse;
import com.auth.service.web.dto.role.RoleResponse;

import jakarta.servlet.http.HttpServletRequest;
import com.auth.service.web.dto.user.UserAssignRoleRequest;
import com.auth.service.web.dto.user.UserCreateRequest;
import com.auth.service.web.dto.user.UserResponse;
import com.auth.service.web.dto.user.UserUpdateRequest;
import com.auth.service.web.dto.user.UserUpdateRolesRequest;

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
        ensureCanReadUsers(currentUser);
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
    public List<UserResponse> listUsers(String authorizationHeader, UUID tenantId) {
        User currentUser = requireCurrentUser(authorizationHeader);
        ensureCanReadUsers(currentUser);
        return (tenantId != null && isSuperAdmin(currentUser)
                        ? userRepository.findByTenant_Id(tenantId)
                        : isSuperAdmin(currentUser)
                                ? userRepository.findAll()
                                : userRepository.findByTenant_Id(currentUser.getTenant().getId()))
                .stream()
                .filter(user -> isSuperAdmin(currentUser) || !hasSuperAdminRole(user))
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public Page<UserResponse> listUsers(String authorizationHeader, UUID tenantId, Pageable pageable) {
        User currentUser = requireCurrentUser(authorizationHeader);
        ensureCanReadUsers(currentUser);
        Page<User> userPage;
        if (tenantId != null && isSuperAdmin(currentUser)) {
            userPage = userRepository.findByTenant_Id(tenantId, pageable);
        } else if (isSuperAdmin(currentUser)) {
            userPage = userRepository.findAll(pageable);
        } else {
            userPage = userRepository.findByTenant_Id(currentUser.getTenant().getId(), pageable);
        }
        if (isSuperAdmin(currentUser)) {
            return userPage.map(this::toResponse);
        }
        List<UserResponse> filteredContent = userPage.getContent().stream()
                .filter(user -> !hasSuperAdminRole(user))
                .map(this::toResponse)
                .toList();
        return new PageImpl<>(filteredContent, pageable, userPage.getTotalElements());
    }

    @Transactional(readOnly = true)
    public UserResponse getUserById(String authorizationHeader, UUID userId) {
        User currentUser = requireCurrentUser(authorizationHeader);
        ensureCanReadUsers(currentUser);
        User user = requireUserInAllowedScope(userId, currentUser);
        return toResponse(user);
    }

    @Transactional
    public UserResponse createUser(String authorizationHeader, UserCreateRequest request) {
        User currentUser = requireCurrentUser(authorizationHeader);
        ensureCanManageUsers(currentUser);
        String email = normalizeEmail(request.email());

        if (!userRepository.findByEmail(email).isEmpty()) {
            throw new ConflictException("Email already exists");
        }

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

        if (!isSuperAdmin(currentUser) && hasAdminRole(user)) {
            throw new ForbiddenException("Only a super administrator can modify an administrator account");
        }

        if (request.email() != null && !request.email().isBlank()) {
            String newEmail = normalizeEmail(request.email());
            if (!newEmail.equals(user.getEmail())) {
                if (!userRepository.findByEmail(newEmail).isEmpty()) {
                    throw new ConflictException("Email already exists");
                }
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

        if (!isSuperAdmin(currentUser) && hasAdminRole(user)) {
            throw new ForbiddenException("Only a super administrator can delete an administrator account");
        }

        userRoleRepository.findByUser_Id(user.getId()).forEach(userRole -> {
            userRoleRepository.delete(userRole);
        });

        List<Session> sessions = sessionRepository.findByUser_Id(user.getId());
        for (Session session : sessions) {
            session.setRevokedAt(Instant.now());
            sessionRepository.save(session);
        }

        userRepository.delete(user);

        writeAudit(currentUser, "USER_DELETE", "User deleted", user.getId().toString());
        return new AuthActionResponse("User deleted successfully");
    }

    @Transactional
    public AuthActionResponse assignRoleToUser(String authorizationHeader, UUID userId, UserAssignRoleRequest request) {
        User currentUser = requireCurrentUser(authorizationHeader);
        ensureCanManageUserRoles(currentUser);

        User user = requireUserInAllowedScope(userId, currentUser);
        if (user.getId().equals(currentUser.getId())) {
            throw new ForbiddenException("You cannot change your own role");
        }
        if (!isSuperAdmin(currentUser) && hasAdminRole(user)) {
            throw new ForbiddenException("Only a super administrator can modify roles of an administrator account");
        }
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
        if (user.getId().equals(currentUser.getId())) {
            throw new ForbiddenException("You cannot change your own role");
        }
        if (!isSuperAdmin(currentUser) && hasAdminRole(user)) {
            throw new ForbiddenException("Only a super administrator can modify roles of an administrator account");
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
        if (user.getId().equals(currentUser.getId())) {
            throw new ForbiddenException("You cannot change your own role");
        }
        if (!isSuperAdmin(currentUser) && hasAdminRole(user)) {
            throw new ForbiddenException("Only a super administrator can modify roles of an administrator account");
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

    private boolean hasAdminRole(User user) {
        return userRoleRepository.findByUser_Id(user.getId())
                .stream()
                .map(UserRole::getRole)
                .anyMatch(role -> role.getName() != null && isAdminRoleName(role.getName()));
    }

    private boolean isAdminRoleName(String roleName) {
        String normalized = roleName.trim().toUpperCase().replaceAll("[\\s-]+", "_");
        return normalized.equals("ADMIN") || normalized.equals("SUPER_ADMIN")
                || normalized.equals("TENANT_ADMIN") || normalized.equals("PLATFORM_ADMIN");
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

    private void ensureCanReadUsers(User currentUser) {
        if (isSuperAdmin(currentUser)) {
            return;
        }

        boolean canRead = userRoleRepository.findByUser_Id(currentUser.getId())
                .stream()
                .map(UserRole::getRole)
                .map(role -> rolePermissionRepository.findByRole_Id(role.getId()))
                .flatMap(List::stream)
                .map(RolePermission::getPermission)
                .anyMatch(permission -> permission.getName() != null
                        && permission.getName().trim().equalsIgnoreCase("USER_READ"));

        if (!canRead) {
            throw new ForbiddenException("User read permission required");
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
        auditLog.setIpAddress(resolveClientIp());
        auditLogRepository.save(auditLog);
    }

    private String resolveClientIp() {
        try {
            HttpServletRequest request = ((ServletRequestAttributes) RequestContextHolder.getRequestAttributes()).getRequest();
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
