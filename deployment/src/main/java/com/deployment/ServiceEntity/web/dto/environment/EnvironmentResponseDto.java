package com.deployment.ServiceEntity.web.dto.environment;

import java.time.Instant;
import java.util.UUID;

public record EnvironmentResponseDto(
    UUID id,
    String name,
    String description,
    UUID tenantId,
    Instant createdAt,
    Instant updatedAt) {}
