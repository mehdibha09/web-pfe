package com.auth.auth.service;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.auth.auth.domain.AuditLog;
import com.auth.auth.domain.Session;
import com.auth.auth.domain.User;
import com.auth.auth.exception.ForbiddenException;
import com.auth.auth.exception.NotFoundException;
import com.auth.auth.exception.UnauthorizedException;
import com.auth.auth.repository.AuditLogRepository;
import com.auth.auth.repository.SessionRepository;
import com.auth.auth.web.dto.AuthActionResponse;
import com.auth.auth.web.dto.SessionResponse;

@Service
public class SessionService {
    private static final String TOKEN_TYPE = "Bearer";

    private final SessionRepository sessionRepository;
    private final AuditLogRepository auditLogRepository;

    public SessionService(SessionRepository sessionRepository, AuditLogRepository auditLogRepository) {
        this.sessionRepository = sessionRepository;
        this.auditLogRepository = auditLogRepository;
    }

    @Transactional(readOnly = true)
    public List<SessionResponse> listSessions(String authorizationHeader) {
        User currentUser = requireCurrentUser(authorizationHeader);
        return sessionRepository.findByUser_Id(currentUser.getId())
                .stream()
                .sorted((first, second) -> second.getCreatedAt().compareTo(first.getCreatedAt()))
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public AuthActionResponse revokeSession(String authorizationHeader, UUID sessionId) {
        Session currentSession = requireValidSession(authorizationHeader);
        User currentUser = currentSession.getUser();
        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new NotFoundException("Session not found"));

        if (!session.getUser().getId().equals(currentUser.getId())) {
            throw new ForbiddenException("Session belongs to another user");
        }

        if (session.getId().equals(currentSession.getId())) {
            throw new ForbiddenException("Cannot revoke your current session");
        }

        session.setRevokedAt(Instant.now());
        sessionRepository.save(session);
        writeAudit(currentUser, "SESSION_REVOKE", "Session revoked", session.getId().toString());
        return new AuthActionResponse("Session revoked successfully");
    }

    private SessionResponse toResponse(Session session) {
        return new SessionResponse(
                session.getId(),
                session.getUser().getId(),
                session.getUser().getEmail(),
                session.getAccessToken(),
                session.getRefreshToken(),
                session.getExpirationDate(),
                session.getCreatedAt(),
                session.getIpAddress(),
                session.getRevokedAt()
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
        auditLogRepository.save(auditLog);
    }
}
