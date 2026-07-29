package com.deployment.ServiceEntity.web.dto.serviceEnvironment;

import java.time.Instant;
import java.util.UUID;

public record ServiceEnvironmentResponseDto(
    UUID id,
    UUID serviceId,
    UUID environmentId,
    UUID tenantId,
    String serviceName,
    String environmentName,
    Instant createdAt,
    Instant updatedAt) {}
