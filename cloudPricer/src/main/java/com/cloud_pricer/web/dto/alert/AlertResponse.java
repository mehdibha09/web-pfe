package com.cloud_pricer.web.dto.alert;

import java.time.Instant;
import java.util.UUID;

public record AlertResponse(
    UUID id,
    UUID tenantId,
    UUID serviceEnvironmentId,
    String type,
    String metric,
    double threshold,
    double actualValue,
    String severity,
    String status,
    String message,
    Instant createdAt,
    String acknowledgedBy,
    Instant resolvedAt
) {}
