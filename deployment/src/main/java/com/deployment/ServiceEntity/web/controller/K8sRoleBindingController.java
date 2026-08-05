package com.deployment.ServiceEntity.web.controller;

import java.util.List;

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
import com.deployment.ServiceEntity.service.AuditService;
import com.deployment.ServiceEntity.web.dto.k8s.K8sRoleBindingRequest;
import com.deployment.ServiceEntity.web.dto.k8s.K8sRoleBindingResponse;
import com.deployment.ServiceEntity.service.TenantNamespaceResolver;
import com.deployment.ServiceEntity.web.routes.ApiRoutes;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping(ApiRoutes.K8sRoleBinding.BASE)
@RequiredArgsConstructor
public class K8sRoleBindingController {

    private final KubernetesClient kubernetesClient;
    private final AuditService auditService;

    @GetMapping
    public ResponseEntity<Page<K8sRoleBindingResponse>> list(
            @RequestParam(required = false) String namespace,
            @RequestParam(defaultValue = "false") boolean cluster,
            @PageableDefault(size = 10) Pageable pageable) {
        UserContext.requirePermission("K8S_READ");
        List<K8sRoleBindingResponse> all;
        if (cluster) {
            all = kubernetesClient.listClusterRoleBindings();
        } else {
            all = kubernetesClient.listRoleBindings(TenantNamespaceResolver.resolveList(namespace));
        }
        int start = (int) pageable.getOffset();
        int end = Math.min(start + pageable.getPageSize(), all.size());
        List<K8sRoleBindingResponse> content = start < all.size() ? all.subList(start, end) : List.of();
        return ResponseEntity.ok(new PageImpl<>(content, pageable, all.size()));
    }

    @PostMapping
    public ResponseEntity<K8sRoleBindingResponse> create(@Valid @RequestBody K8sRoleBindingRequest dto) {
        UserContext.requirePermission("K8S_MANAGE");
        String ns = TenantNamespaceResolver.resolve(dto.namespace());

        StringBuilder yamlSpec = new StringBuilder();
        yamlSpec.append("roleRef:\n");
        yamlSpec.append("  apiGroup: rbac.authorization.k8s.io\n");
        yamlSpec.append("  kind: ").append(dto.roleKind()).append("\n");
        yamlSpec.append("  name: ").append(dto.roleName()).append("\n");

        if (dto.subjects() != null && !dto.subjects().isEmpty()) {
            yamlSpec.append("subjects:\n");
            for (var subj : dto.subjects()) {
                yamlSpec.append("  - kind: ").append(subj.kind() != null ? subj.kind() : "ServiceAccount").append("\n");
                yamlSpec.append("    name: ").append(subj.name()).append("\n");
                if (subj.namespace() != null && !subj.namespace().isEmpty()) {
                    yamlSpec.append("    namespace: ").append(subj.namespace()).append("\n");
                }
            }
        }

        kubernetesClient.createOrUpdateRoleBinding(dto.name(), ns, dto.isClusterBinding(), yamlSpec.toString());

        K8sRoleBindingResponse result = K8sRoleBindingResponse.fromSimulated(
            dto.name(), ns, dto.isClusterBinding(), dto.roleKind(), dto.roleName());
        auditService.record("K8S_ROLE_BINDING_CREATE", "k8s-role-binding", dto.name(),
            "Role binding created (name='" + dto.name() + "', namespace='" + ns + "', roleKind='" + dto.roleKind() + "', roleName='" + dto.roleName() + "')");
        return ResponseEntity.status(HttpStatus.CREATED).body(result);
    }

    @DeleteMapping("/{name}")
    public ResponseEntity<Void> delete(
            @PathVariable String name,
            @RequestParam(required = false) String namespace,
            @RequestParam(defaultValue = "false") boolean cluster) {
        UserContext.requirePermission("K8S_MANAGE");
        kubernetesClient.deleteRoleBinding(name, TenantNamespaceResolver.resolve(namespace), cluster);
        auditService.record("K8S_ROLE_BINDING_DELETE", "k8s-role-binding", name, "Role binding deleted (name='" + name + "', cluster=" + cluster + ")");
        return ResponseEntity.noContent().build();
    }
}
