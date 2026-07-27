package com.deployment.ServiceEntity.web.dto.k8s;

import java.util.UUID;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record K8sDeploymentRequest(
    @NotBlank String name,
    @NotBlank String dockerImage,
    int replicas,
    int port,
    Integer targetPort,
    String protocol,
    String namespace,
    @NotNull UUID serviceEnvironmentId,
    @NotNull UUID tenantId,
    String cpuRequest,
    String memoryRequest,
    String cpuLimit,
    String memoryLimit,
    String imagePullPolicy,
    String serviceType,
    String restartPolicy,
    String labels,
    String secrets,
    String envVars,
    ProbeConfig livenessProbe,
    ProbeConfig readinessProbe,
    ProbeConfig startupProbe) {}
