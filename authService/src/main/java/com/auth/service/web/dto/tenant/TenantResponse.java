package com.auth.service.web.dto.tenant;

import java.time.Instant;
import java.util.UUID;

public record TenantResponse(
        UUID id,
        String name,
        String contactEmail,
        String phone,
        String modeDeployment,
        String status,
        long usersCount,
        Instant createdAt,
        Instant updatedAt
) {
}
