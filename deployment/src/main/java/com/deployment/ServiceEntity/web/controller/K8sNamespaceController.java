package com.deployment.ServiceEntity.web.controller;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

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
import org.springframework.web.bind.annotation.RestController;

import com.deployment.ServiceEntity.domain.KubernetesClient;
import com.deployment.ServiceEntity.service.AuditService;
import com.deployment.ServiceEntity.web.dto.k8s.K8sNamespaceRequest;
import com.deployment.ServiceEntity.web.dto.k8s.K8sNamespaceResponse;
import com.deployment.ServiceEntity.web.routes.ApiRoutes;
import com.deployment.ServiceEntity.service.TenantNamespaceResolver;
import com.deployment.ServiceEntity.config.UserContext;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping(ApiRoutes.K8sNamespace.BASE)
@RequiredArgsConstructor
public class K8sNamespaceController {

    private static final List<String> SYSTEM_NAMESPACES = List.of(
        "kube-system",
        "kube-public",
        "kube-node-lease",
        "calico-system",
        "tigera-operator",
        "local-path-storage",
        "monitoring"
    );

    private final KubernetesClient kubernetesClient;
    private final AuditService auditService;

    @GetMapping
    public ResponseEntity<Page<K8sNamespaceResponse>> list(
            @PageableDefault(size = 10) Pageable pageable) {
        UserContext.requirePermission("K8S_READ");
        List<K8sNamespaceResponse> all = kubernetesClient.listNamespaces();

        List<K8sNamespaceResponse> filtered = all.stream()
            .filter(ns -> !SYSTEM_NAMESPACES.contains(ns.name()))
            .filter(ns -> {
                if (UserContext.isSuperAdmin()) {
                    return true;
                }
                String tenantId = UserContext.getTenantId() != null
                    ? UserContext.getTenantId().toString() : null;
                return tenantId != null && ns.name().equals("tenant-" + tenantId);
            })
            .collect(Collectors.toList());

        int start = (int) pageable.getOffset();
        int end = Math.min(start + pageable.getPageSize(), filtered.size());
        List<K8sNamespaceResponse> content = start < filtered.size()
            ? filtered.subList(start, end) : List.of();
        return ResponseEntity.ok(new PageImpl<>(content, pageable, filtered.size()));
    }

    @GetMapping("/{name}")
    public ResponseEntity<K8sNamespaceResponse> get(@PathVariable String name) {
        UserContext.requirePermission("K8S_READ");
        K8sNamespaceResponse ns = kubernetesClient.getNamespace(TenantNamespaceResolver.resolve(name));
        if (ns == null) return ResponseEntity.noContent().build();
        return ResponseEntity.ok(ns);
    }

    @PostMapping
    public ResponseEntity<K8sNamespaceResponse> create(@Valid @RequestBody K8sNamespaceRequest dto) {
        UserContext.requirePermission("K8S_MANAGE");
        kubernetesClient.createNamespace(dto.name(), dto.labels());
        K8sNamespaceResponse result = kubernetesClient.getNamespace(dto.name());
        if (result == null) {
            result = K8sNamespaceResponse.fromSimulated(dto.name());
        }
        auditService.record("K8S_NAMESPACE_CREATE", "k8s-namespace", dto.name(), "Namespace created (name='" + dto.name() + "')");
        return ResponseEntity.status(HttpStatus.CREATED).body(result);
    }

    @DeleteMapping("/{name}")
    public ResponseEntity<Void> delete(@PathVariable String name) {
        UserContext.requirePermission("K8S_MANAGE");
        kubernetesClient.deleteNamespace(name);
        auditService.record("K8S_NAMESPACE_DELETE", "k8s-namespace", name, "Namespace deleted (name='" + name + "')");
        return ResponseEntity.noContent().build();
    }
}