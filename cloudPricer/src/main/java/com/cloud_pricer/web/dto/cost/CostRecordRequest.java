package com.cloud_pricer.web.dto.cost;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record CostRecordRequest(
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
    List<CostBreakdownRequest> breakdowns
) {}
