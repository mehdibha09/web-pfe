package com.auth.service.web.dto;

import java.time.Instant;
import java.util.UUID;

public record TenantResponse(
        UUID id,
        String name,
        String contactEmail,
        String modeDeployment,
        String status,
        long usersCount,
        Instant createdAt,
        Instant updatedAt
) {
}
