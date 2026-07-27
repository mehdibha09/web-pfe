package com.deployment.ServiceEntity.web.dto.k8s;

public record K8sPodResponse(
    String name,
    String status,
    String ready,
    int restarts,
    String age,
    String namespace) {}
