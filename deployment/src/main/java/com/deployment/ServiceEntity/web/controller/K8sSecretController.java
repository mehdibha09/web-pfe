package com.deployment.ServiceEntity.web.controller;

import java.util.Base64;
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
import com.deployment.ServiceEntity.domain.KubernetesClient;
import com.deployment.ServiceEntity.service.AuditService;
import com.deployment.ServiceEntity.web.dto.k8s.K8sSecretRequest;
import com.deployment.ServiceEntity.web.dto.k8s.K8sSecretResponse;
import com.deployment.ServiceEntity.service.TenantNamespaceResolver;
import com.deployment.ServiceEntity.web.routes.ApiRoutes;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping(ApiRoutes.K8sSecret.BASE)
@RequiredArgsConstructor
public class K8sSecretController {

    private final KubernetesClient kubernetesClient;
    private final AuditService auditService;

    @GetMapping
    public ResponseEntity<Page<K8sSecretResponse>> list(
            @RequestParam(required = false) String namespace,
            @PageableDefault(size = 10) Pageable pageable) {
        UserContext.requirePermission("K8S_READ");
        List<K8sSecretResponse> all = kubernetesClient.listSecrets(TenantNamespaceResolver.resolveList(namespace));
        int start = (int) pageable.getOffset();
        int end = Math.min(start + pageable.getPageSize(), all.size());
        List<K8sSecretResponse> content = start < all.size() ? all.subList(start, end) : List.of();
        return ResponseEntity.ok(new PageImpl<>(content, pageable, all.size()));
    }

    @GetMapping("/{name}")
    public ResponseEntity<K8sSecretResponse> get(
            @PathVariable String name,
            @RequestParam(required = false) String namespace) {
        UserContext.requirePermission("K8S_READ");
        K8sSecretResponse secret = kubernetesClient.getSecret(name, TenantNamespaceResolver.resolve(namespace));
        if (secret == null) return ResponseEntity.noContent().build();
        return ResponseEntity.ok(secret);
    }

    @PostMapping
    public ResponseEntity<K8sSecretResponse> create(
            @Valid @RequestBody K8sSecretRequest dto) {
        UserContext.requirePermission("K8S_MANAGE");
        String ns = TenantNamespaceResolver.resolve(dto.namespace());
        String type = dto.type() != null && !dto.type().isBlank() ? dto.type() : "Opaque";

        StringBuilder yamlSpec = new StringBuilder();
        yamlSpec.append("type: ").append(type).append("\n");

        if (dto.labels() != null && !dto.labels().isEmpty()) {
            yamlSpec.append("metadata:\n  labels:\n");
            for (var entry : dto.labels().entrySet()) {
                yamlSpec.append("    ").append(entry.getKey()).append(": ").append(entry.getValue()).append("\n");
            }
        }

        yamlSpec.append("data:\n");
        if (dto.data() != null) {
            for (var entry : dto.data().entrySet()) {
                String encoded = Base64.getEncoder().encodeToString(
                    entry.getValue() != null ? entry.getValue().getBytes() : "".getBytes());
                yamlSpec.append("  ").append(entry.getKey()).append(": ").append(encoded).append("\n");
            }
        }

        kubernetesClient.createOrUpdateSecret(dto.name(), ns, yamlSpec.toString());

        K8sSecretResponse result = kubernetesClient.getSecret(dto.name(), ns);
        if (result == null) {
            result = K8sSecretResponse.fromSimulated(dto.name(), ns, type);
        }
        auditService.record("K8S_SECRET_CREATE", "k8s-secret", dto.name(), "Secret created (name='" + dto.name() + "', namespace='" + ns + "', type='" + type + "')");
        return ResponseEntity.status(HttpStatus.CREATED).body(result);
    }

    @PutMapping("/{name}")
    public ResponseEntity<K8sSecretResponse> update(
            @PathVariable String name,
            @Valid @RequestBody K8sSecretRequest dto) {
        UserContext.requirePermission("K8S_MANAGE");
        String ns = TenantNamespaceResolver.resolve(dto.namespace());
        String type = dto.type() != null && !dto.type().isBlank() ? dto.type() : "Opaque";

        StringBuilder yamlSpec = new StringBuilder();
        yamlSpec.append("type: ").append(type).append("\n");
        yamlSpec.append("data:\n");
        if (dto.data() != null) {
            for (var entry : dto.data().entrySet()) {
                String encoded = Base64.getEncoder().encodeToString(
                    entry.getValue() != null ? entry.getValue().getBytes() : "".getBytes());
                yamlSpec.append("  ").append(entry.getKey()).append(": ").append(encoded).append("\n");
            }
        }

        kubernetesClient.createOrUpdateSecret(name, ns, yamlSpec.toString());

        K8sSecretResponse result = kubernetesClient.getSecret(name, ns);
        if (result == null) {
            result = K8sSecretResponse.fromSimulated(name, ns, type);
        }
        auditService.record("K8S_SECRET_UPDATE", "k8s-secret", name, "Secret updated (name='" + name + "', namespace='" + ns + "')");
        return ResponseEntity.ok(result);
    }

    @DeleteMapping("/{name}")
    public ResponseEntity<Void> delete(
            @PathVariable String name,
            @RequestParam(required = false) String namespace) {
        UserContext.requirePermission("K8S_MANAGE");
        kubernetesClient.deleteSecret(name, TenantNamespaceResolver.resolve(namespace));
        auditService.record("K8S_SECRET_DELETE", "k8s-secret", name, "Secret deleted (name='" + name + "')");
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/batch")
    public ResponseEntity<Void> deleteBatch(@RequestBody Map<String, List<String>> body) {
        UserContext.requirePermission("K8S_MANAGE");
        List<String> names = body.get("names");
        String namespace = TenantNamespaceResolver.resolve(body.getOrDefault("namespace", List.of("default")).get(0));
        if (names != null) {
            for (String name : names) {
                kubernetesClient.deleteSecret(name, namespace);
            }
            auditService.record("K8S_SECRET_DELETE_BATCH", "k8s-secret", null, "Secrets deleted in batch (names=" + names + ")");
        }
        return ResponseEntity.noContent().build();
    }
}
