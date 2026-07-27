package com.cloud_pricer.web.dto.cost;

import java.util.UUID;

public record CostAggregateResponse(
    String groupKey,
    double totalCost,
    double computeCost,
    double storageCost,
    double networkCost,
    double backupCost,
    double osCost,
    long recordCount
) {}
