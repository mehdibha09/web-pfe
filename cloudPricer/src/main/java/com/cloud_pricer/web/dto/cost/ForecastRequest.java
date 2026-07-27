package com.cloud_pricer.web.dto.cost;

import java.util.UUID;

public record ForecastRequest(
    UUID tenantId,
    UUID serviceEnvironmentId,
    String period
) {}
