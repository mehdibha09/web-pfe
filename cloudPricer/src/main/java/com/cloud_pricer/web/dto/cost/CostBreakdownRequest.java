package com.cloud_pricer.web.dto.cost;

public record CostBreakdownRequest(
    String type,
    double unitCost,
    double quantity
) {}
