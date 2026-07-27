package com.deployment.ServiceEntity.web.dto.k8s;

import java.util.Map;
import jakarta.validation.constraints.NotBlank;

public record K8sConfigMapRequest(
    @NotBlank String name,
    String namespace,
    Map<String, String> data,
    Map<String, String> binaryData,
    Map<String, String> labels) {}
