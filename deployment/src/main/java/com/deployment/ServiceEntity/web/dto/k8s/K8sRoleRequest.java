package com.deployment.ServiceEntity.web.dto.k8s;

import java.util.List;
import jakarta.validation.constraints.NotBlank;

public record K8sRoleRequest(
    @NotBlank String name,
    String namespace,
    boolean isClusterRole,
    List<PolicyRule> rules) {

    public record PolicyRule(
        List<String> apiGroups,
        List<String> resources,
        List<String> verbs,
        List<String> resourceNames) {}
}
