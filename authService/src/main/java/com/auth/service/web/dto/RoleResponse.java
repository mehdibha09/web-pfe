package com.auth.auth.web.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record RoleResponse(
        UUID id,
        String name,
        String description,
        UUID tenantId,
        Instant createdAt,
        List<String> permissions
) {
}
