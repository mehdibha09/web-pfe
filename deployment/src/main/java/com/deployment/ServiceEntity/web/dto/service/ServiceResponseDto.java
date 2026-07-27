package com.deployment.ServiceEntity.web.dto.service;

import java.time.Instant;
import java.util.UUID;

public record ServiceResponseDto(
    UUID id,
    String name,
    String type,
    String status,
    UUID tenantId,
    Instant createdAt,
    Instant updatedAt) {}
