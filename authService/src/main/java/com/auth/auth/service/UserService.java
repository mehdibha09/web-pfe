package com.auth.auth.service;

import java.util.List;
import java.util.UUID;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.auth.auth.domain.AuditLog;
import com.auth.auth.domain.Session;
import com.auth.auth.domain.User;
import com.auth.auth.domain.UserStatus;
import com.auth.auth.exception.BadRequestException;
import com.auth.auth.exception.ConflictException;
import com.auth.auth.exception.ForbiddenException;
import com.auth.auth.exception.NotFoundException;
import com.auth.auth.exception.UnauthorizedException;
import com.auth.auth.repository.AuditLogRepository;
import com.auth.auth.repository.SessionRepository;
import com.auth.auth.repository.UserRepository;
import com.auth.auth.repository.UserRoleRepository;
import com.auth.auth.web.dto.AuthActionResponse;
import com.auth.auth.web.dto.RoleResponse;
import com.auth.auth.web.dto.UserCreateRequest;
import com.auth.auth.web.dto.UserResponse;
import com.auth.auth.web.dto.UserUpdateRequest;

@Service
public class UserService {
    private static final String TOKEN_TYPE = "Bearer";

    private final UserRepository userRepository;
    private final SessionRepository sessionRepository;
    private final UserRoleRepository userRoleRepository;
    private final AuditLogRepository auditLogRepository;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    public UserService(
            UserRepository userRepository,
            SessionRepository sessionRepository,
            UserRoleRepository userRoleRepository,
            AuditLogRepository auditLogRepository
    ) {
        this.userRepository = userRepository;
        this.sessionRepository = sessionRepository;
        this.userRoleRepository = userRoleRepository;
        this.auditLogRepository = auditLogRepository;
    }

    @Transactional(readOnly = true)
    public List<RoleResponse> listUserRoles(String authorizationHeader, UUID userId) {
        User currentUser = requireCurrentUser(authorizationHeader);
        User user = requireUserInSameTenant(userId, currentUser);

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
        return userRepository.findByTenant_Id(currentUser.getTenant().getId())
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public UserResponse getUserById(String authorizationHeader, UUID userId) {
        User currentUser = requireCurrentUser(authorizationHeader);
        User user = requireUserInSameTenant(userId, currentUser);
        return toResponse(user);
    }

    @Transactional
    public UserResponse createUser(String authorizationHeader, UserCreateRequest request) {
        User currentUser = requireCurrentUser(authorizationHeader);
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
        User user = requireUserInSameTenant(userId, currentUser);

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
        User user = requireUserInSameTenant(userId, currentUser);

        if (user.getId().equals(currentUser.getId())) {
            throw new BadRequestException("You cannot delete your own account");
        }

        user.setStatus(UserStatus.DELETED);
        userRepository.save(user);

        writeAudit(currentUser, "USER_DELETE", "User marked as deleted", user.getId().toString());
        return new AuthActionResponse("User deleted successfully");
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

    private User requireUserInSameTenant(UUID userId, User currentUser) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("User not found"));

        if (!user.getTenant().getId().equals(currentUser.getTenant().getId())) {
            throw new ForbiddenException("User belongs to another tenant");
        }
        return user;
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
