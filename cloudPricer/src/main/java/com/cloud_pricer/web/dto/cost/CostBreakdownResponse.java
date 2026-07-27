package com.cloud_pricer.web.dto.cost;

import java.time.Instant;
import java.util.UUID;

public record CostBreakdownResponse(
    UUID id,
    UUID costRecordId,
    String type,
    double unitCost,
    double quantity,
    double total,
    Instant createdAt
) {}
