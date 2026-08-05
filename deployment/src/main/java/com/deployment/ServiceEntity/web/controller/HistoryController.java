package com.deployment.ServiceEntity.web.controller;

import java.time.Instant;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.deployment.ServiceEntity.config.UserContext;
import com.deployment.ServiceEntity.repository.AuditLogRepository;
import com.deployment.ServiceEntity.web.dto.history.HistoryEntryDto;
import com.deployment.ServiceEntity.web.routes.ApiRoutes;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping(ApiRoutes.History.BASE)
@RequiredArgsConstructor
public class HistoryController {

    private final AuditLogRepository auditLogRepository;

    @GetMapping
    public ResponseEntity<Page<HistoryEntryDto>> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String resource,
            @RequestParam(required = false) Instant from,
            @RequestParam(required = false) Instant to,
            @RequestParam(required = false) UUID userId) {
        UserContext.requirePermission("DEPLOYMENT_READ");
        UUID tenantId = UserContext.isSuperAdmin() ? null : UserContext.getTenantId();
        Instant fromInstant = from != null ? from : Instant.EPOCH;
        Instant toInstant = to != null ? to : Instant.parse("9999-12-31T23:59:59.999Z");
        PageRequest pageable = PageRequest.of(page, Math.min(Math.max(size, 1), 200),
                Sort.by(Sort.Direction.DESC, "timestamp"));
        Page<HistoryEntryDto> result = userId != null
                ? auditLogRepository.searchByUser(tenantId, action, resource, fromInstant, toInstant, userId, pageable)
                        .map(HistoryEntryDto::from)
                : auditLogRepository.search(tenantId, action, resource, fromInstant, toInstant, pageable)
                        .map(HistoryEntryDto::from);
        return ResponseEntity.ok(result);
    }
}
