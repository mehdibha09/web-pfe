package com.deployment.ServiceEntity.web.dto.k8s;

import java.util.List;
import java.util.Map;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Min;

public record K8sServiceRequest(
    @NotBlank String name,
    String namespace,
    String type,
    @Min(1) int port,
    Integer targetPort,
    String protocol,
    Map<String, String> selector,
    Map<String, String> labels) {}