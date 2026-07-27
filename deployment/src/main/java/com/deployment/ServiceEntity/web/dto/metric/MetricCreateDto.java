package com.deployment.ServiceEntity.web.dto.metric;

import java.time.Instant;
import java.util.UUID;

import jakarta.validation.constraints.NotNull;

public record MetricCreateDto(
        @NotNull Double cpuUsage,
        @NotNull Double ramUsage,
        @NotNull Double networkUsage,
        @NotNull Double diskUsage,
        @NotNull Integer pods,
        @NotNull UUID serviceEnvironmentId,
        Instant timestamp) {
}
