package com.deployment.ServiceEntity.web.dto.metric;

import java.time.Instant;
import java.util.UUID;

public record MetricResponseDto(
    UUID id,
    float cpuUsage,
    float ramUsage,
    float networkUsage,
    float diskUsage,
    int pods,
    UUID serviceEnvironmentId,
    Instant timestamp,
    Instant createdAt,
    Instant updatedAt) {}
