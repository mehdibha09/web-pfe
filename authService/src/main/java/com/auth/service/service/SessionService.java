package com.auth.service.service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import com.auth.service.domain.AuditLog;
import com.auth.service.config.ClientIpResolver;
import com.auth.service.domain.RolePermission;
import com.auth.service.domain.Session;
import com.auth.service.domain.User;
import com.auth.service.domain.UserRole;
import com.auth.service.exception.ForbiddenException;
import com.auth.service.exception.NotFoundException;
import com.auth.service.exception.UnauthorizedException;
import com.auth.service.repository.AuditLogRepository;
import com.auth.service.repository.RolePermissionRepository;
import com.auth.service.repository.SessionRepository;
import com.auth.service.repository.UserRoleRepository;
import com.auth.service.web.dto.auth.AuthActionResponse;
import com.auth.service.web.dto.session.SessionResponse;

import jakarta.servlet.http.HttpServletRequest;

@Service
public class SessionService {
    private static final String TOKEN_TYPE = "Bearer";

    private final SessionRepository sessionRepository;
    private final AuditLogRepository auditLogRepository;
    private final UserRoleRepository userRoleRepository;
    private final RolePermissionRepository rolePermissionRepository;
    private final ClientIpResolver clientIpResolver;

    public SessionService(SessionRepository sessionRepository, AuditLogRepository auditLogRepository,
                          UserRoleRepository userRoleRepository,
                          RolePermissionRepository rolePermissionRepository,
                          ClientIpResolver clientIpResolver) {
        this.sessionRepository = sessionRepository;
        this.auditLogRepository = auditLogRepository;
        this.userRoleRepository = userRoleRepository;
        this.rolePermissionRepository = rolePermissionRepository;
        this.clientIpResolver = clientIpResolver;
    }

    @Transactional(readOnly = true)
    public List<SessionResponse> listSessions(String authorizationHeader) {
        User currentUser = requireCurrentUser(authorizationHeader);
        List<Session> allSessions;
        if (isSuperAdmin(currentUser)) {
            allSessions = sessionRepository.findAll();
        } else if (canManageSessions(currentUser)) {
            allSessions = sessionRepository.findByTenant_Id(currentUser.getTenant().getId());
        } else {
            allSessions = sessionRepository.findByUser_Id(currentUser.getId());
        }
        List<Session> sorted = allSessions.stream()
                .sorted((first, second) -> second.getCreatedAt().compareTo(first.getCreatedAt()))
                .toList();

        List<Session> recentActive = allSessions.stream()
                .filter(s -> s.getRevokedAt() == null)
                .toList();

        return sorted.stream()
                .map(session -> toResponse(session, recentActive))
                .toList();
    }

    @Transactional(readOnly = true)
    public Page<SessionResponse> listSessions(String authorizationHeader, Pageable pageable) {
        User currentUser = requireCurrentUser(authorizationHeader);
        Page<Session> page;
        if (isSuperAdmin(currentUser)) {
            page = sessionRepository.findAll(pageable);
        } else if (canManageSessions(currentUser)) {
            page = sessionRepository.findByTenant_Id(currentUser.getTenant().getId(), pageable);
        } else {
            page = sessionRepository.findByUser_Id(currentUser.getId(), pageable);
        }
        List<Session> recentActive = page.getContent().stream()
                .filter(s -> s.getRevokedAt() == null)
                .toList();
        return page.map(session -> toResponse(session, recentActive));
    }

    @Transactional
    public AuthActionResponse revokeSession(String authorizationHeader, UUID sessionId) {
        Session currentSession = requireValidSession(authorizationHeader);
        User currentUser = currentSession.getUser();
        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new NotFoundException("Session not found"));

        if (session.getId().equals(currentSession.getId())) {
            throw new ForbiddenException("Cannot revoke your current session");
        }

        if (!session.getUser().getId().equals(currentUser.getId())) {
            ensureCanManageSessions(currentUser);
        }

        session.setRevokedAt(Instant.now());
        sessionRepository.save(session);
        writeAudit(currentUser, "SESSION_REVOKE", "Session revoked", session.getId().toString());
        return new AuthActionResponse("Session revoked successfully");
    }

    private boolean isSuperAdmin(User currentUser) {
        return userRoleRepository.findByUser_Id(currentUser.getId())
                .stream()
                .map(UserRole::getRole)
                .anyMatch(role -> role.getName() != null && role.getName().trim().equalsIgnoreCase("super-admin"));
    }

    private boolean canManageSessions(User currentUser) {
        if (isSuperAdmin(currentUser)) {
            return true;
        }

        return userRoleRepository.findByUser_Id(currentUser.getId())
                .stream()
                .map(UserRole::getRole)
                .map(role -> rolePermissionRepository.findByRole_Id(role.getId()))
                .flatMap(List::stream)
                .map(RolePermission::getPermission)
                .anyMatch(permission -> permission.getName() != null
                        && permission.getName().trim().equalsIgnoreCase("SESSION_MANAGE"));
    }

    private void ensureCanManageSessions(User currentUser) {
        if (!canManageSessions(currentUser)) {
            throw new ForbiddenException("Session management permission required");
        }
    }

    private SessionResponse toResponse(Session session, List<Session> allActiveSessions) {
        List<String> anomalies = new ArrayList<>();

        if (session.getRevokedAt() == null) {
            for (Session other : allActiveSessions) {
                if (other.getId().equals(session.getId())) continue;
                if (other.getIpAddress() != null && session.getIpAddress() != null
                        && !other.getIpAddress().equals(session.getIpAddress())) {
                    anomalies.add("Multiple active sessions from different IPs (" + session.getIpAddress() + ", " + other.getIpAddress() + ")");
                    break;
                }
            }
        }

        if (session.getLocalization() != null && !session.getLocalization().equals("Unknown")) {
            long differentLocationCount = allActiveSessions.stream()
                    .filter(s -> s.getRevokedAt() == null)
                    .filter(s -> s.getLocalization() != null)
                    .map(Session::getLocalization)
                    .distinct()
                    .count();
            if (differentLocationCount > 1) {
                anomalies.add("Active sessions from different locations");
            }
        }

        return new SessionResponse(
                session.getId(),
                session.getUser().getId(),
                session.getUser().getEmail(),
                session.getAccessToken(),
                session.getRefreshToken(),
                session.getExpirationDate(),
                session.getCreatedAt(),
                session.getIpAddress(),
                session.getBrowser(),
                session.getOs(),
                session.getLocalization(),
                session.getRevokedAt(),
                anomalies
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

    private void writeAudit(User currentUser, String action, String details, String resourceId) {
        AuditLog auditLog = new AuditLog();
        auditLog.setUser(currentUser);
        auditLog.setTenant(currentUser.getTenant());
        auditLog.setAction(action);
        auditLog.setDetails(details);
        auditLog.setResource("session");
        auditLog.setResourceId(resourceId);
        auditLog.setIpAddress(resolveClientIp());
        auditLogRepository.save(auditLog);
    }

    private String resolveClientIp() {
        return clientIpResolver.resolve();
    }
}
