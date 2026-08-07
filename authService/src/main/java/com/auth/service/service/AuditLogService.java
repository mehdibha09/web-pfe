package com.auth.service.service;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.auth.service.domain.AuditLog;
import com.auth.service.domain.RolePermission;
import com.auth.service.domain.Session;
import com.auth.service.domain.User;
import com.auth.service.domain.UserRole;
import com.auth.service.exception.BadRequestException;
import com.auth.service.exception.ForbiddenException;
import com.auth.service.exception.UnauthorizedException;
import com.auth.service.repository.AuditLogRepository;
import com.auth.service.repository.RolePermissionRepository;
import com.auth.service.repository.SessionRepository;
import com.auth.service.repository.UserRoleRepository;
import com.auth.service.web.dto.audit.AuditLogQuery;
import com.auth.service.web.dto.audit.AuditLogResponse;

@Service
public class AuditLogService {
    private static final String TOKEN_TYPE = "Bearer";

    private final AuditLogRepository auditLogRepository;
    private final UserRoleRepository userRoleRepository;
    private final RolePermissionRepository rolePermissionRepository;
    private final SessionRepository sessionRepository;

    public AuditLogService(
            AuditLogRepository auditLogRepository,
            UserRoleRepository userRoleRepository,
            RolePermissionRepository rolePermissionRepository,
            SessionRepository sessionRepository
    ) {
        this.auditLogRepository = auditLogRepository;
        this.userRoleRepository = userRoleRepository;
        this.rolePermissionRepository = rolePermissionRepository;
        this.sessionRepository = sessionRepository;
    }

    @Transactional(readOnly = true)
    public List<AuditLogResponse> listAuditLogs(String authorizationHeader, AuditLogQuery query) {
        User currentUser = requireCurrentUser(authorizationHeader);
        ensureCanReadAuditLogs(currentUser);

        Instant from = query.from() == null ? Instant.now().minusSeconds(60L * 60L * 24L * 30L) : query.from();
        Instant to = query.to() == null ? Instant.now() : query.to();

        if (from.isAfter(to)) {
            throw new BadRequestException("from must be before to");
        }

        List<AuditLog> logs;
        if (isSuperAdmin(currentUser)) {
            logs = auditLogRepository.findByTimestampBetween(from, to);
        } else {
            logs = auditLogRepository.findByTenant_IdAndTimestampBetween(currentUser.getTenant().getId(), from, to);
        }

        return logs.stream()
                .filter(log -> query.action() == null || query.action().isBlank() || log.getAction().equalsIgnoreCase(query.action().trim()))
                .filter(log -> query.resource() == null || query.resource().isBlank() || (log.getResource() != null && log.getResource().equalsIgnoreCase(query.resource().trim())))
                .filter(log -> query.userId() == null || (log.getUser() != null && query.userId().equals(log.getUser().getId())))
                .sorted((first, second) -> second.getTimestamp().compareTo(first.getTimestamp()))
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public Page<AuditLogResponse> listAuditLogs(String authorizationHeader, AuditLogQuery query, Pageable pageable) {
        User currentUser = requireCurrentUser(authorizationHeader);
        ensureCanReadAuditLogs(currentUser);

        Instant from = query.from() == null ? Instant.now().minusSeconds(60L * 60L * 24L * 30L) : query.from();
        Instant to = query.to() == null ? Instant.now() : query.to();

        if (from.isAfter(to)) {
            throw new BadRequestException("from must be before to");
        }

        UUID tenantId = isSuperAdmin(currentUser) ? null : currentUser.getTenant().getId();
        String action = query.action() == null || query.action().isBlank() ? null : query.action().trim();
        String resource = query.resource() == null || query.resource().isBlank() ? null : query.resource().trim();

        return auditLogRepository.search(tenantId, from, to, action, resource, query.userId(), pageable)
                .map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public List<String> listAuditResources(String authorizationHeader) {
        User currentUser = requireCurrentUser(authorizationHeader);
        ensureCanReadAuditLogs(currentUser);

        List<String> resources;
        if (isSuperAdmin(currentUser)) {
            resources = auditLogRepository.findDistinctResources();
        } else {
            resources = auditLogRepository.findDistinctResourcesByTenantId(currentUser.getTenant().getId());
        }
        return resources.stream()
                .map(String::toUpperCase)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<String> listAuditActions(String authorizationHeader) {
        User currentUser = requireCurrentUser(authorizationHeader);
        ensureCanReadAuditLogs(currentUser);

        List<String> actions;
        if (isSuperAdmin(currentUser)) {
            actions = auditLogRepository.findDistinctActions();
        } else {
            actions = auditLogRepository.findDistinctActionsByTenantId(currentUser.getTenant().getId());
        }
        return actions.stream()
                .map(String::toUpperCase)
                .toList();
    }

    private void ensureCanReadAuditLogs(User currentUser) {
        if (isSuperAdmin(currentUser)) {
            return;
        }

        boolean canReadAuditLogs = userRoleRepository.findByUser_Id(currentUser.getId())
                .stream()
                .map(UserRole::getRole)
                .map(role -> rolePermissionRepository.findByRole_Id(role.getId()))
                .flatMap(List::stream)
                .map(RolePermission::getPermission)
                .anyMatch(permission -> permission.getName() != null
                        && permission.getName().trim().equalsIgnoreCase("AUDIT_READ"));

        if (!canReadAuditLogs) {
            throw new ForbiddenException("Audit log read permission required");
        }
    }

    private boolean isSuperAdmin(User currentUser) {
        return userRoleRepository.findByUser_Id(currentUser.getId())
                .stream()
                .map(UserRole::getRole)
                .anyMatch(role -> role.getName() != null && role.getName().trim().equalsIgnoreCase("super-admin"));
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
                log.getResourceId(),
                log.getIpAddress()
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
