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
import com.deployment.ServiceEntity.service.AuditService;
import com.deployment.ServiceEntity.web.dto.k8s.K8sServiceAccountRequest;
import com.deployment.ServiceEntity.web.dto.k8s.K8sServiceAccountResponse;
import com.deployment.ServiceEntity.service.TenantNamespaceResolver;
import com.deployment.ServiceEntity.web.routes.ApiRoutes;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping(ApiRoutes.K8sServiceAccount.BASE)
@RequiredArgsConstructor
public class K8sServiceAccountController {

    private final KubernetesClient kubernetesClient;
    private final AuditService auditService;

    @GetMapping
    public ResponseEntity<Page<K8sServiceAccountResponse>> list(
            @RequestParam(required = false) String namespace,
            @PageableDefault(size = 10) Pageable pageable) {
        UserContext.requirePermission("K8S_READ");
        List<K8sServiceAccountResponse> all = kubernetesClient.listServiceAccounts(TenantNamespaceResolver.resolveList(namespace));
        int start = (int) pageable.getOffset();
        int end = Math.min(start + pageable.getPageSize(), all.size());
        List<K8sServiceAccountResponse> content = start < all.size() ? all.subList(start, end) : List.of();
        return ResponseEntity.ok(new PageImpl<>(content, pageable, all.size()));
    }

    @GetMapping("/{name}")
    public ResponseEntity<K8sServiceAccountResponse> get(
            @PathVariable String name,
            @RequestParam(required = false) String namespace) {
        UserContext.requirePermission("K8S_READ");
        K8sServiceAccountResponse sa = kubernetesClient.getServiceAccount(name, TenantNamespaceResolver.resolve(namespace));
        if (sa == null) return ResponseEntity.noContent().build();
        return ResponseEntity.ok(sa);
    }

    @PostMapping
    public ResponseEntity<K8sServiceAccountResponse> create(
            @Valid @RequestBody K8sServiceAccountRequest dto) {
        UserContext.requirePermission("K8S_MANAGE");
        String ns = TenantNamespaceResolver.resolve(dto.namespace());

        StringBuilder yamlSpec = new StringBuilder();
        if (dto.labels() != null && !dto.labels().isEmpty()) {
            yamlSpec.append("labels:\n");
            for (var entry : dto.labels().entrySet()) {
                yamlSpec.append("  ").append(entry.getKey()).append(": ").append(entry.getValue()).append("\n");
            }
        }

        kubernetesClient.createOrUpdateServiceAccount(dto.name(), ns, yamlSpec.toString());

        K8sServiceAccountResponse result = kubernetesClient.getServiceAccount(dto.name(), ns);
        if (result == null) {
            result = K8sServiceAccountResponse.fromSimulated(dto.name(), ns);
        }
        auditService.record("K8S_SERVICE_ACCOUNT_CREATE", "k8s-service-account", dto.name(), "Service account created (name='" + dto.name() + "', namespace='" + ns + "')");
        return ResponseEntity.status(HttpStatus.CREATED).body(result);
    }

    @DeleteMapping("/{name}")
    public ResponseEntity<Void> delete(
            @PathVariable String name,
            @RequestParam(required = false) String namespace) {
        UserContext.requirePermission("K8S_MANAGE");
        kubernetesClient.deleteServiceAccount(name, TenantNamespaceResolver.resolve(namespace));
        auditService.record("K8S_SERVICE_ACCOUNT_DELETE", "k8s-service-account", name, "Service account deleted (name='" + name + "')");
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/batch")
    public ResponseEntity<Void> deleteBatch(@RequestBody Map<String, List<String>> body) {
        UserContext.requirePermission("K8S_MANAGE");
        List<String> names = body.get("names");
        String namespace = TenantNamespaceResolver.resolve(body.getOrDefault("namespace", List.of("default")).get(0));
        if (names != null) {
            for (String name : names) {
                kubernetesClient.deleteServiceAccount(name, namespace);
            }
            auditService.record("K8S_SERVICE_ACCOUNT_DELETE_BATCH", "k8s-service-account", null, "Service accounts deleted in batch (names=" + names + ")");
        }
        return ResponseEntity.noContent().build();
    }
}
