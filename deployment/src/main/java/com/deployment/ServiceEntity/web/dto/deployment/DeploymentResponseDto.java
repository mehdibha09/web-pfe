package com.deployment.ServiceEntity.web.dto.deployment;

import java.time.Instant;
import java.util.UUID;

public record DeploymentResponseDto(
    UUID id,
    String version,
    String status,
    String notes,
    UUID serviceEnvironmentId,
    Instant deployedAt,
    Instant createdAt,
    Instant updatedAt) {}
