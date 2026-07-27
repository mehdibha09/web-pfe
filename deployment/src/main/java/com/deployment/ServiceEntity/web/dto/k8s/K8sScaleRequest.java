package com.deployment.ServiceEntity.web.dto.k8s;

import jakarta.validation.constraints.Min;

public record K8sScaleRequest(
    @Min(0) int replicas) {}
