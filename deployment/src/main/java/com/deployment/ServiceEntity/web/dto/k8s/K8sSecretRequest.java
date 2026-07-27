package com.deployment.ServiceEntity.web.dto.k8s;

import java.util.Map;
import jakarta.validation.constraints.NotBlank;

public record K8sSecretRequest(
    @NotBlank String name,
    String namespace,
    String type,
    Map<String, String> data,
    Map<String, String> labels) {}
