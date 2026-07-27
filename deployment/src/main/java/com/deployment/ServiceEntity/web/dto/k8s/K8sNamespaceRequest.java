package com.deployment.ServiceEntity.web.dto.k8s;

import java.util.Map;
import jakarta.validation.constraints.NotBlank;

public record K8sNamespaceRequest(
    @NotBlank String name,
    Map<String, String> labels) {}