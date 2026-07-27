package com.cloud_pricer.web.dto.cost;

import java.util.UUID;

public record MetricSnapshot(
    UUID id,
    float cpuUsage,
    float ramUsage,
    float diskUsage,
    float networkUsage,
    int pods,
    UUID serviceEnvironmentId
) {}
