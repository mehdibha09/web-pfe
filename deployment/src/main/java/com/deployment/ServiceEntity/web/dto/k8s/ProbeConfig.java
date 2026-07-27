package com.deployment.ServiceEntity.web.dto.k8s;

public record ProbeConfig(
    boolean enabled,
    String path,
    int port,
    int initialDelaySeconds,
    int periodSeconds,
    int failureThreshold
) {}
