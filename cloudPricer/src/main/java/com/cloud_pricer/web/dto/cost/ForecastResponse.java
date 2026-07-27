package com.cloud_pricer.web.dto.cost;

import java.time.Instant;
import java.util.UUID;

public record ForecastResponse(
    UUID id,
    UUID tenantId,
    UUID serviceEnvironmentId,
    String period,
    double predictedCost,
    double confidenceLevel,
    Instant createdAt
) {}
