package com.auth.service.web.dto;

import java.time.Instant;
import java.util.UUID;

public record AuditLogResponse(
        UUID id,
        UUID userId,
        String userEmail,
        UUID tenantId,
        String action,
        Instant timestamp,
        String details,
        String resource,
        String resourceId
) {
}
