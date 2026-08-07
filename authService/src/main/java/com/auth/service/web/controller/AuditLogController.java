
package com.auth.service.web.controller;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.auth.service.service.AuditLogService;
import com.auth.service.web.dto.audit.AuditLogQuery;
import com.auth.service.web.dto.audit.AuditLogResponse;
import com.auth.service.web.routes.ApiRoutes;

@RestController
@RequestMapping(ApiRoutes.AuditLogs.BASE)
@Validated
public class AuditLogController {

    private final AuditLogService auditLogService;

    public AuditLogController(AuditLogService auditLogService) {
        this.auditLogService = auditLogService;
    }

    @GetMapping
    public ResponseEntity<Page<AuditLogResponse>> listAuditLogs(
            @RequestHeader("Authorization") String authorizationHeader,
            @RequestParam(required = false) Instant from,
            @RequestParam(required = false) Instant to,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String resource,
            @RequestParam(required = false) UUID userId,
            @PageableDefault(size = 10) Pageable pageable
    ) {
        AuditLogQuery query = new AuditLogQuery(from, to, action, resource, userId);
        return ResponseEntity.ok(auditLogService.listAuditLogs(authorizationHeader, query, pageable));
    }

    @GetMapping(ApiRoutes.AuditLogs.RESOURCES)
    public ResponseEntity<List<String>> listAuditResources(
            @RequestHeader("Authorization") String authorizationHeader
    ) {
        return ResponseEntity.ok(auditLogService.listAuditResources(authorizationHeader));
    }

    @GetMapping(ApiRoutes.AuditLogs.ACTIONS)
    public ResponseEntity<List<String>> listAuditActions(
            @RequestHeader("Authorization") String authorizationHeader
    ) {
        return ResponseEntity.ok(auditLogService.listAuditActions(authorizationHeader));
    }
}
