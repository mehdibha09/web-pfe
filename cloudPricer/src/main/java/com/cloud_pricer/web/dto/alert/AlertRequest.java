package com.cloud_pricer.web.dto.alert;

import java.util.UUID;

public record AlertRequest(
    UUID tenantId,
    UUID serviceEnvironmentId,
    String type,
    String metric,
    double threshold,
    double actualValue,
    String severity,
    String message
) {}
