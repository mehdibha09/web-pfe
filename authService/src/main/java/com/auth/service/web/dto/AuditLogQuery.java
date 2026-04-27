package com.auth.service.web.dto;

import java.time.Instant;
import java.util.UUID;

public record AuditLogQuery(
        Instant from,
        Instant to,
        String action,
        String resource,
        UUID userId
) {
}
