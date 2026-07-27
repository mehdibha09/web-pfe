package com.deployment.ServiceEntity.web.dto.k8s;

import java.util.Map;
import jakarta.validation.constraints.NotBlank;

public record K8sServiceAccountRequest(
    @NotBlank String name,
    String namespace,
    Map<String, String> labels,
    Map<String, String> annotations) {}
