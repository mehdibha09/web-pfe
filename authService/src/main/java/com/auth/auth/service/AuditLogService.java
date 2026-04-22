package com.auth.auth.service;

import java.time.Instant;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.auth.auth.domain.AuditLog;
import com.auth.auth.domain.Session;
import com.auth.auth.domain.User;
import com.auth.auth.exception.BadRequestException;
import com.auth.auth.exception.UnauthorizedException;
import com.auth.auth.repository.AuditLogRepository;
import com.auth.auth.repository.SessionRepository;
import com.auth.auth.web.dto.AuditLogQuery;
import com.auth.auth.web.dto.AuditLogResponse;

@Service
public class AuditLogService {
    private static final String TOKEN_TYPE = "Bearer";

    private final AuditLogRepository auditLogRepository;
    private final SessionRepository sessionRepository;

    public AuditLogService(AuditLogRepository auditLogRepository, SessionRepository sessionRepository) {
        this.auditLogRepository = auditLogRepository;
        this.sessionRepository = sessionRepository;
    }

    @Transactional(readOnly = true)
    public List<AuditLogResponse> listAuditLogs(String authorizationHeader, AuditLogQuery query) {
        User currentUser = requireCurrentUser(authorizationHeader);

        Instant from = query.from() == null ? Instant.now().minusSeconds(60L * 60L * 24L * 30L) : query.from();
        Instant to = query.to() == null ? Instant.now() : query.to();

        if (from.isAfter(to)) {
            throw new BadRequestException("from must be before to");
        }

        return auditLogRepository.findByTenant_IdAndTimestampBetween(currentUser.getTenant().getId(), from, to)
                .stream()
                .filter(log -> query.action() == null || query.action().isBlank() || log.getAction().equalsIgnoreCase(query.action().trim()))
                .filter(log -> query.resource() == null || query.resource().isBlank() || (log.getResource() != null && log.getResource().equalsIgnoreCase(query.resource().trim())))
                .filter(log -> query.userId() == null || (log.getUser() != null && query.userId().equals(log.getUser().getId())))
                .sorted((first, second) -> second.getTimestamp().compareTo(first.getTimestamp()))
                .map(this::toResponse)
                .toList();
    }

    private AuditLogResponse toResponse(AuditLog log) {
        return new AuditLogResponse(
                log.getId(),
                log.getUser() == null ? null : log.getUser().getId(),
                log.getUser() == null ? null : log.getUser().getEmail(),
                log.getTenant().getId(),
                log.getAction(),
                log.getTimestamp(),
                log.getDetails(),
                log.getResource(),
                log.getResourceId()
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
}
