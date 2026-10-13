package com.cloud_pricer.web.dto.quota;

import java.util.UUID;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public record QuotaRequest(
    @NotNull UUID serviceEnvironmentId,
    @Min(0) double maxCpu,
    @Min(0) double maxRam,
    @Min(0) double maxStorage,
    @Min(0) int maxPods,
    @Min(0) double maxBudget,
    @NotBlank
    @Pattern(regexp = "MONTHLY|WEEKLY|DAILY|MONTH|WEEK|DAY",
             message = "period must be one of MONTHLY, WEEKLY, DAILY") String period,
    boolean isActive,
    boolean autoStopOnExceed
) {}
