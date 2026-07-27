package com.deployment.ServiceEntity.web.dto.metric;

import java.time.Instant;
import java.util.UUID;

import lombok.Data;

@Data
public class MetricHistoryDto {
    private UUID id;
    private float cpuUsage;
    private float ramUsage;
    private float networkUsage;
    private float diskUsage;
    private int pods;
    private Instant timestamp;
    private Instant createdAt;
}