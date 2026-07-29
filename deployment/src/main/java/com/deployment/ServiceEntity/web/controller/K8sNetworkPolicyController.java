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
import com.deployment.ServiceEntity.web.dto.k8s.K8sNetworkPolicyRequest;
import com.deployment.ServiceEntity.web.dto.k8s.K8sNetworkPolicyResponse;
import com.deployment.ServiceEntity.service.TenantNamespaceResolver;
import com.deployment.ServiceEntity.web.routes.ApiRoutes;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping(ApiRoutes.K8sNetworkPolicy.BASE)
@RequiredArgsConstructor
public class K8sNetworkPolicyController {

    private final KubernetesClient kubernetesClient;

    @GetMapping
    public ResponseEntity<Page<K8sNetworkPolicyResponse>> list(
            @RequestParam(required = false) String namespace,
            @PageableDefault(size = 10) Pageable pageable) {
        UserContext.requirePermission("K8S_READ");
        List<K8sNetworkPolicyResponse> all = kubernetesClient.listNetworkPolicies(namespace);
        int start = (int) pageable.getOffset();
        int end = Math.min(start + pageable.getPageSize(), all.size());
        List<K8sNetworkPolicyResponse> content = start < all.size() ? all.subList(start, end) : List.of();
        return ResponseEntity.ok(new PageImpl<>(content, pageable, all.size()));
    }

    @GetMapping("/{name}")
    public ResponseEntity<K8sNetworkPolicyResponse> get(
            @PathVariable String name,
            @RequestParam(required = false) String namespace) {
        UserContext.requirePermission("K8S_READ");
        K8sNetworkPolicyResponse policy = kubernetesClient.getNetworkPolicy(name, TenantNamespaceResolver.resolve(namespace));
        if (policy == null) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(policy);
    }

    @PostMapping
    public ResponseEntity<K8sNetworkPolicyResponse> create(
            @Valid @RequestBody K8sNetworkPolicyRequest dto) {
        UserContext.requirePermission("K8S_MANAGE");
        String ns = TenantNamespaceResolver.resolve(dto.namespace());

        StringBuilder spec = new StringBuilder();
        spec.append("podSelector:\n");
        if (dto.podSelectorLabels() != null && !dto.podSelectorLabels().isBlank()) {
            spec.append("  matchLabels:\n");
            for (String label : dto.podSelectorLabels().split(",")) {
                String[] parts = label.trim().split("=", 2);
                if (parts.length == 2) {
                    spec.append("    ").append(parts[0].trim()).append(": ").append(parts[1].trim()).append("\n");
                }
            }
        } else {
            spec.append("  {}\n");
        }

        spec.append("policyTypes:\n");
        List<String> types = dto.policyTypes();
        if (types == null || types.isEmpty()) types = List.of("Ingress");
        for (String t : types) {
            spec.append("  - ").append(t).append("\n");
        }

        if (dto.ingressRules() != null && !dto.ingressRules().isEmpty()) {
            spec.append("ingress:\n");
            for (var rule : dto.ingressRules()) {
                spec.append("  - from:\n");
                if (rule.ipBlocks() != null) {
                    for (String ip : rule.ipBlocks()) {
                        spec.append("      - ipBlock:\n");
                        spec.append("          cidr: ").append(ip).append("\n");
                    }
                }
                if (rule.namespaceSelectorLabels() != null && !rule.namespaceSelectorLabels().isEmpty()) {
                    spec.append("      - namespaceSelector:\n");
                    spec.append("          matchLabels:\n");
                    for (String l : rule.namespaceSelectorLabels()) {
                        String[] parts = l.split("=", 2);
                        spec.append("            ").append(parts[0].trim()).append(": ").append(parts.length > 1 ? parts[1].trim() : "").append("\n");
                    }
                }
                if (rule.podSelectorLabels() != null && !rule.podSelectorLabels().isEmpty()) {
                    spec.append("      - podSelector:\n");
                    spec.append("          matchLabels:\n");
                    for (String l : rule.podSelectorLabels()) {
                        String[] parts = l.split("=", 2);
                        spec.append("            ").append(parts[0].trim()).append(": ").append(parts.length > 1 ? parts[1].trim() : "").append("\n");
                    }
                }
                if (rule.ports() != null) {
                    spec.append("    ports:\n");
                    for (String port : rule.ports()) {
                        String[] parts = port.split("/", 2);
                        spec.append("      - protocol: ").append(parts.length > 1 ? parts[1] : "TCP").append("\n");
                        spec.append("        port: ").append(parts[0]).append("\n");
                    }
                }
            }
        }

        if (dto.egressRules() != null && !dto.egressRules().isEmpty()) {
            spec.append("egress:\n");
            for (var rule : dto.egressRules()) {
                spec.append("  - to:\n");
                if (rule.ipBlocks() != null) {
                    for (String ip : rule.ipBlocks()) {
                        spec.append("      - ipBlock:\n");
                        spec.append("          cidr: ").append(ip).append("\n");
                    }
                }
                if (rule.namespaceSelectorLabels() != null && !rule.namespaceSelectorLabels().isEmpty()) {
                    spec.append("      - namespaceSelector:\n");
                    spec.append("          matchLabels:\n");
                    for (String l : rule.namespaceSelectorLabels()) {
                        String[] parts = l.split("=", 2);
                        spec.append("            ").append(parts[0].trim()).append(": ").append(parts.length > 1 ? parts[1].trim() : "").append("\n");
                    }
                }
                if (rule.podSelectorLabels() != null && !rule.podSelectorLabels().isEmpty()) {
                    spec.append("      - podSelector:\n");
                    spec.append("          matchLabels:\n");
                    for (String l : rule.podSelectorLabels()) {
                        String[] parts = l.split("=", 2);
                        spec.append("            ").append(parts[0].trim()).append(": ").append(parts.length > 1 ? parts[1].trim() : "").append("\n");
                    }
                }
                if (rule.ports() != null) {
                    spec.append("    ports:\n");
                    for (String port : rule.ports()) {
                        String[] parts = port.split("/", 2);
                        spec.append("      - protocol: ").append(parts.length > 1 ? parts[1] : "TCP").append("\n");
                        spec.append("        port: ").append(parts[0]).append("\n");
                    }
                }
            }
        }

        kubernetesClient.createOrUpdateNetworkPolicy(dto.name(), ns, spec.toString());
        K8sNetworkPolicyResponse result = kubernetesClient.getNetworkPolicy(dto.name(), ns);
        if (result == null) {
            result = K8sNetworkPolicyResponse.fromSimulated(dto.name(), ns,
                dto.podSelectorLabels() != null ? dto.podSelectorLabels() : "{}",
                types);
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(result);
    }

    @DeleteMapping("/{name}")
    public ResponseEntity<Void> delete(
            @PathVariable String name,
            @RequestParam(required = false) String namespace) {
        UserContext.requirePermission("K8S_MANAGE");
        kubernetesClient.deleteNetworkPolicy(name, TenantNamespaceResolver.resolve(namespace));
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/batch")
    public ResponseEntity<Void> deleteBatch(@RequestBody Map<String, List<String>> body) {
        UserContext.requirePermission("K8S_MANAGE");
        List<String> names = body.get("names");
        String namespace = TenantNamespaceResolver.resolve(body.getOrDefault("namespace", List.of("default")).get(0));
        if (names != null) {
            for (String name : names) {
                kubernetesClient.deleteNetworkPolicy(name, namespace);
            }
        }
        return ResponseEntity.noContent().build();
    }
}
