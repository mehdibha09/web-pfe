package com.cloud_pricer.web.dto.pricing;

public record CalculateCostResponse(
    double computeCost,
    double storageCost,
    double networkCost,
    double backupCost,
    double osCost,
    double totalCost
) {
}
