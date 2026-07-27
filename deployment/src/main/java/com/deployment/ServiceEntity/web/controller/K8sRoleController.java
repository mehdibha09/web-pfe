package com.deployment.ServiceEntity.web.controller;

import java.util.List;
import java.util.Map;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.deployment.ServiceEntity.config.UserContext;
import com.deployment.ServiceEntity.domain.KubernetesClient;
import com.deployment.ServiceEntity.web.dto.k8s.K8sRoleRequest;
import com.deployment.ServiceEntity.web.dto.k8s.K8sRoleResponse;
import com.deployment.ServiceEntity.web.routes.ApiRoutes;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping(ApiRoutes.K8sRole.BASE)
@RequiredArgsConstructor
public class K8sRoleController {

    private final KubernetesClient kubernetesClient;

    @GetMapping
    public ResponseEntity<Page<K8sRoleResponse>> list(
            @RequestParam(required = false) String namespace,
            @RequestParam(defaultValue = "false") boolean cluster,
            @PageableDefault(size = 10) Pageable pageable) {
        UserContext.requirePermission("K8S_READ");
        List<K8sRoleResponse> all;
        if (cluster) {
            all = kubernetesClient.listClusterRoles();
        } else {
            all = kubernetesClient.listRoles(namespace != null ? namespace : "default");
        }
        int start = (int) pageable.getOffset();
        int end = Math.min(start + pageable.getPageSize(), all.size());
        List<K8sRoleResponse> content = start < all.size() ? all.subList(start, end) : List.of();
        return ResponseEntity.ok(new PageImpl<>(content, pageable, all.size()));
    }

    @GetMapping("/{name}")
    public ResponseEntity<K8sRoleResponse> get(
            @PathVariable String name,
            @RequestParam(required = false) String namespace,
            @RequestParam(defaultValue = "false") boolean cluster) {
        UserContext.requirePermission("K8S_READ");
        K8sRoleResponse role;
        if (cluster) {
            role = kubernetesClient.getClusterRole(name);
        } else {
            role = kubernetesClient.getRole(name, namespace != null ? namespace : "default");
        }
        if (role == null) return ResponseEntity.noContent().build();
        return ResponseEntity.ok(role);
    }

    @PostMapping
    public ResponseEntity<K8sRoleResponse> create(@Valid @RequestBody K8sRoleRequest dto) {
        UserContext.requirePermission("K8S_MANAGE");
        String ns = dto.namespace() != null ? dto.namespace() : "default";

        StringBuilder yamlSpec = new StringBuilder();
        if (dto.rules() != null) {
            for (var rule : dto.rules()) {
                yamlSpec.append("  - apiGroups:\n");
                if (rule.apiGroups() != null && !rule.apiGroups().isEmpty()) {
                    for (String ag : rule.apiGroups()) {
                        yamlSpec.append("      - ").append(ag).append("\n");
                    }
                } else {
                    yamlSpec.append("      - \"\"\n");
                }
                yamlSpec.append("    resources:\n");
                if (rule.resources() != null && !rule.resources().isEmpty()) {
                    for (String r : rule.resources()) {
                        yamlSpec.append("      - ").append(r).append("\n");
                    }
                } else {
                    yamlSpec.append("      - \"*\"\n");
                }
                yamlSpec.append("    verbs:\n");
                if (rule.verbs() != null && !rule.verbs().isEmpty()) {
                    for (String v : rule.verbs()) {
                        yamlSpec.append("      - ").append(v).append("\n");
                    }
                } else {
                    yamlSpec.append("      - \"*\"\n");
                }
                if (rule.resourceNames() != null && !rule.resourceNames().isEmpty()) {
                    yamlSpec.append("    resourceNames:\n");
                    for (String rn : rule.resourceNames()) {
                        yamlSpec.append("      - ").append(rn).append("\n");
                    }
                }
            }
        }

        kubernetesClient.createOrUpdateRole(dto.name(), ns, dto.isClusterRole(), yamlSpec.toString());

        K8sRoleResponse result;
        if (dto.isClusterRole()) {
            result = kubernetesClient.getClusterRole(dto.name());
        } else {
            result = kubernetesClient.getRole(dto.name(), ns);
        }
        if (result == null) {
            result = K8sRoleResponse.fromSimulated(dto.name(), ns, dto.isClusterRole());
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(result);
    }

    @DeleteMapping("/{name}")
    public ResponseEntity<Void> delete(
            @PathVariable String name,
            @RequestParam(required = false) String namespace,
            @RequestParam(defaultValue = "false") boolean cluster) {
        UserContext.requirePermission("K8S_MANAGE");
        kubernetesClient.deleteRole(name, namespace != null ? namespace : "default", cluster);
        return ResponseEntity.noContent().build();
    }
}
