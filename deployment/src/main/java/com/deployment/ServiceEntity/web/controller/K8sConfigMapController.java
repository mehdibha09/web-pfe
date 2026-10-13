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
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.deployment.ServiceEntity.config.UserContext;
import com.deployment.ServiceEntity.exception.ApiException;
import com.deployment.ServiceEntity.infra.KubernetesClient;
import com.deployment.ServiceEntity.service.AuditService;
import com.deployment.ServiceEntity.service.TenantNamespaceResolver;
import com.deployment.ServiceEntity.web.dto.k8s.K8sConfigMapRequest;
import com.deployment.ServiceEntity.web.dto.k8s.K8sConfigMapResponse;
import com.deployment.ServiceEntity.web.routes.ApiRoutes;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping(ApiRoutes.K8sConfigMap.BASE)
@RequiredArgsConstructor
public class K8sConfigMapController {

    private final KubernetesClient kubernetesClient;
    private final AuditService auditService;

    // Empêche l'injection YAML via des clés user-controlled dans data/binaryData.
    private static final java.util.regex.Pattern SAFE_KEY = java.util.regex.Pattern.compile("^[A-Za-z0-9._-]+$");

    private static void validateKey(String key) {
        if (key == null || !SAFE_KEY.matcher(key).matches()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_KEY",
                    "Invalid data key '" + key + "': only [A-Za-z0-9._-] are allowed");
        }
    }

    @GetMapping
    public ResponseEntity<Page<K8sConfigMapResponse>> list(
            @RequestParam(required = false) String namespace,
            @PageableDefault(size = 10) Pageable pageable) {
        UserContext.requirePermission("K8S_READ");
        String ns = TenantNamespaceResolver.resolveList(namespace);
        List<K8sConfigMapResponse> all = TenantNamespaceResolver.applyBlacklist(
            kubernetesClient.listConfigMaps(ns), K8sConfigMapResponse::namespace);
        int start = (int) pageable.getOffset();
        int end = Math.min(start + pageable.getPageSize(), all.size());
        List<K8sConfigMapResponse> content = start < all.size() ? all.subList(start, end) : List.of();
        return ResponseEntity.ok(new PageImpl<>(content, pageable, all.size()));
    }

    @GetMapping("/{name}")
    public ResponseEntity<K8sConfigMapResponse> get(
            @PathVariable String name,
            @RequestParam(required = false) String namespace) {
        UserContext.requirePermission("K8S_READ");
        String ns = TenantNamespaceResolver.resolve(namespace);
        K8sConfigMapResponse cm = kubernetesClient.getConfigMap(name, ns);
        if (cm == null) return ResponseEntity.noContent().build();
        return ResponseEntity.ok(cm);
    }

    @PostMapping
    public ResponseEntity<K8sConfigMapResponse> create(
            @Valid @RequestBody K8sConfigMapRequest dto) {
        UserContext.requirePermission("K8S_MANAGE");
        String ns = TenantNamespaceResolver.resolve(dto.namespace());

        StringBuilder yamlSpec = new StringBuilder();
        yamlSpec.append("data:\n");

        if (dto.data() != null) {
            for (var entry : dto.data().entrySet()) {
                validateKey(entry.getKey());
                yamlSpec.append("  ").append(entry.getKey()).append(": |\n");
                yamlSpec.append("    ").append(entry.getValue()).append("\n");
            }
        }

        if (dto.binaryData() != null) {
            yamlSpec.append("binaryData:\n");
            for (var entry : dto.binaryData().entrySet()) {
                validateKey(entry.getKey());
                yamlSpec.append("  ").append(entry.getKey()).append(": ").append(entry.getValue()).append("\n");
            }
        }

        kubernetesClient.createOrUpdateConfigMap(dto.name(), ns, yamlSpec.toString(), dto.labels());
        K8sConfigMapResponse result = kubernetesClient.getConfigMap(dto.name(), ns);
        if (result == null) {
            result = K8sConfigMapResponse.fromSimulated(dto.name(), ns, dto.data());
        }
        auditService.record("K8S_CONFIGMAP_CREATE", "k8s-configmap", dto.name(), "ConfigMap created (name='" + dto.name() + "', namespace='" + ns + "')");
        return ResponseEntity.status(HttpStatus.CREATED).body(result);
    }

    @PutMapping("/{name}")
    public ResponseEntity<K8sConfigMapResponse> update(
            @PathVariable String name,
            @Valid @RequestBody K8sConfigMapRequest dto) {
        UserContext.requirePermission("K8S_MANAGE");
        String ns = TenantNamespaceResolver.resolve(dto.namespace());

        StringBuilder yamlSpec = new StringBuilder();
        yamlSpec.append("data:\n");
        if (dto.data() != null) {
            for (var entry : dto.data().entrySet()) {
                validateKey(entry.getKey());
                yamlSpec.append("  ").append(entry.getKey()).append(": |\n");
                yamlSpec.append("    ").append(entry.getValue()).append("\n");
            }
        }
        if (dto.binaryData() != null) {
            yamlSpec.append("binaryData:\n");
            for (var entry : dto.binaryData().entrySet()) {
                validateKey(entry.getKey());
                yamlSpec.append("  ").append(entry.getKey()).append(": ").append(entry.getValue()).append("\n");
            }
        }

        kubernetesClient.createOrUpdateConfigMap(name, ns, yamlSpec.toString(), dto.labels());
        K8sConfigMapResponse result = kubernetesClient.getConfigMap(name, ns);
        if (result == null) {
            result = K8sConfigMapResponse.fromSimulated(name, ns, dto.data());
        }
        auditService.record("K8S_CONFIGMAP_UPDATE", "k8s-configmap", name, "ConfigMap updated (name='" + name + "', namespace='" + ns + "')");
        return ResponseEntity.ok(result);
    }

    @DeleteMapping("/{name}")
    public ResponseEntity<Void> delete(
            @PathVariable String name,
            @RequestParam(required = false) String namespace) {
        UserContext.requirePermission("K8S_MANAGE");
        String ns = TenantNamespaceResolver.resolve(namespace);
        kubernetesClient.deleteConfigMap(name, ns);
        auditService.record("K8S_CONFIGMAP_DELETE", "k8s-configmap", name, "ConfigMap deleted (name='" + name + "', namespace='" + ns + "')");
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/batch")
    public ResponseEntity<Void> deleteBatch(@RequestBody Map<String, List<String>> body) {
        UserContext.requirePermission("K8S_MANAGE");
        List<String> names = body.get("names");
        String ns = TenantNamespaceResolver.resolve(body.getOrDefault("namespace", List.of()).isEmpty() ? null : body.get("namespace").get(0));
        if (names != null) {
            for (String name : names) {
                kubernetesClient.deleteConfigMap(name, ns);
            }
            auditService.record("K8S_CONFIGMAP_DELETE_BATCH", "k8s-configmap", null, "ConfigMaps deleted in batch (names=" + names + ")");
        }
        return ResponseEntity.noContent().build();
    }
}
