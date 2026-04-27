package com.auth.service.web.dto;

import java.time.Instant;
import java.util.UUID;

public record UserResponse(
        UUID id,
        String email,
        String status,
        UUID tenantId,
        String tenantName,
        Instant createdAt,
        Instant updatedAt
) {
}
