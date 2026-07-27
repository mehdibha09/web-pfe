package com.cloud_pricer.web.dto.quota;

import java.util.UUID;

public record QuotaRequest(
    UUID serviceEnvironmentId,
    double maxCpu,
    double maxRam,
    double maxStorage,
    int maxPods,
    double maxBudget,
    String period,
    boolean isActive
) {}
