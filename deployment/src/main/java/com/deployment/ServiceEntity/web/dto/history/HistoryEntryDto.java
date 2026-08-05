package com.deployment.ServiceEntity.web.dto.history;

import java.time.Instant;
import java.util.UUID;

import com.deployment.ServiceEntity.domain.AuditLog;

public record HistoryEntryDto(
        UUID id,
        UUID userId,
        UUID tenantId,
        String action,
        String resource,
        String resourceId,
        String details,
        Instant timestamp) {

    public static HistoryEntryDto from(AuditLog log) {
        return new HistoryEntryDto(
                log.getId(),
                log.getUserId(),
                log.getTenantId(),
                log.getAction(),
                log.getResource(),
                log.getResourceId(),
                log.getDetails(),
                log.getTimestamp());
    }
}
