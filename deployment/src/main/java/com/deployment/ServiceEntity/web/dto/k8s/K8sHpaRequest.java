package com.deployment.ServiceEntity.web.dto.k8s;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

public record K8sHpaRequest(
    @Min(1) int minReplicas,
    @Min(1) @Max(100) int maxReplicas,
    @Min(1) @Max(100) int cpuTargetAverageUtilization,
    @Min(0) @Max(100) int memoryTargetAverageUtilization) {}
