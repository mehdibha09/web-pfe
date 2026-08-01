package com.deployment.ServiceEntity.web.dto.k8s;

import jakarta.validation.constraints.NotBlank;

public record DeploymentTemplateRequest(
    @NotBlank String name,
    String description,
    @NotBlank String dockerImage,
    int port,
    String cpuLimit,
    String memoryLimit,
    String cpuRequest,
    String memoryRequest,
    String envVars,
    String labels,
    String protocol,
    String imagePullPolicy,
    String serviceType,
    String restartPolicy,
    String livenessProbe,
    String readinessProbe,
    String startupProbe,
    boolean publicTemplate,
    String tenantId) {}
