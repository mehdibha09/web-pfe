package com.cloud_pricer.web.dto.cost;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record CostRecordResponse(
    UUID id,
    UUID tenantId,
    UUID serviceEnvironmentId,
    Instant periodStart,
    Instant periodEnd,
    String mode,
    double computeCost,
    double storageCost,
    double networkCost,
    double backupCost,
    double osCost,
    double totalCost,
    List<CostBreakdownResponse> breakdowns,
    Instant createdAt,
    Instant updatedAt
) {}
