package com.cloud_pricer.web.dto.quota;

import java.time.Instant;
import java.util.UUID;

public record QuotaResponse(
    UUID id,
    UUID serviceEnvironmentId,
    double maxCpu,
    double maxRam,
    double maxStorage,
    int maxPods,
    double maxBudget,
    String period,
    boolean isActive,
    Instant createdAt,
    Instant updatedAt
) {}
