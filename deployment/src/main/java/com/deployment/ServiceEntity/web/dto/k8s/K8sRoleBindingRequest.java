package com.deployment.ServiceEntity.web.dto.k8s;

import java.util.List;
import jakarta.validation.constraints.NotBlank;

public record K8sRoleBindingRequest(
    @NotBlank String name,
    String namespace,
    boolean isClusterBinding,
    @NotBlank String roleKind,
    @NotBlank String roleName,
    List<Subject> subjects) {

    public record Subject(
        String kind,
        String name,
        String namespace) {}
}
