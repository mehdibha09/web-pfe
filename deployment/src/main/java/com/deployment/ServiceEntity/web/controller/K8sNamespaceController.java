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

import com.deployment.ServiceEntity.infra.KubernetesClient;
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

    private final KubernetesClient kubernetesClient;
    private final AuditService auditService;

    @GetMapping
    public ResponseEntity<Page<K8sNamespaceResponse>> list(
            @PageableDefault(size = 10) Pageable pageable) {
        UserContext.requirePermission("K8S_READ");
        List<K8sNamespaceResponse> all = kubernetesClient.listNamespaces();

        List<K8sNamespaceResponse> filtered = all.stream()
            .filter(ns -> !TenantNamespaceResolver.isSystemNamespace(ns.name()))
            .filter(ns -> {
                if (UserContext.isSuperAdmin()) {
                    return true;
                }
                String prefix = TenantNamespaceResolver.tenantNamespacePrefix();
                return prefix != null && ns.name().startsWith(prefix);
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
        String name = resolveOwnedNamespace(dto.name());
        kubernetesClient.createNamespace(name, dto.labels());
        K8sNamespaceResponse result = kubernetesClient.getNamespace(name);
        if (result == null) {
            result = K8sNamespaceResponse.fromSimulated(dto.name());
        }
        auditService.record("K8S_NAMESPACE_CREATE", "k8s-namespace", name, "Namespace created (name='" + name + "')");
        return ResponseEntity.status(HttpStatus.CREATED).body(result);
    }

    @DeleteMapping("/{name}")
    public ResponseEntity<Void> delete(@PathVariable String name) {
        UserContext.requirePermission("K8S_MANAGE");
        String resolved = resolveOwnedNamespace(name);
        kubernetesClient.deleteNamespace(resolved);
        auditService.record("K8S_NAMESPACE_DELETE", "k8s-namespace", resolved, "Namespace deleted (name='" + resolved + "')");
        return ResponseEntity.noContent().build();
    }

    /**
     * Pour un non-superadmin, force le namespace dans le prefix tenant-{id8} :
     * rejette (403) toute tentative de créer/supprimer un namespace d'un autre
     * tenant ou du cluster. Le superadmin gère des noms libres.
     */
    private String resolveOwnedNamespace(String raw) {
        if (UserContext.isSuperAdmin()) {
            return raw;
        }
        String prefix = TenantNamespaceResolver.tenantNamespacePrefix();
        if (prefix == null) {
            throw new com.deployment.ServiceEntity.exception.ApiException(
                    HttpStatus.FORBIDDEN, "FORBIDDEN", "Namespace management not permitted for this tenant");
        }
        if (raw == null || !raw.startsWith(prefix)) {
            throw new com.deployment.ServiceEntity.exception.ApiException(
                    HttpStatus.FORBIDDEN, "FORBIDDEN",
                    "Tenants may only manage namespaces under '" + prefix + "'");
        }
        return raw;
    }
}