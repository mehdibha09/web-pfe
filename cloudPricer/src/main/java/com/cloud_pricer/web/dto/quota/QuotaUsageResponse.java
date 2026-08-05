package com.cloud_pricer.web.dto.quota;

import java.time.Instant;

public record QuotaUsageResponse(
    double cpu,
    double ram,
    double storage,
    int pods,
    Instant measuredAt
) {}
