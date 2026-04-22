package com.auth.auth.web.dto;

import java.time.Instant;
import java.util.UUID;

public record TenantResponse(
        UUID id,
        String name,
        String contactEmail,
        String modeDeployment,
        String status,
        Instant createdAt,
        Instant updatedAt
) {
}
