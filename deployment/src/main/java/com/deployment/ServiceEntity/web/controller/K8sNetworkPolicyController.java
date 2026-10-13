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
import com.deployment.ServiceEntity.infra.KubernetesClient;
import com.deployment.ServiceEntity.service.AuditService;
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
    private final AuditService auditService;

    @GetMapping
    public ResponseEntity<Page<K8sNetworkPolicyResponse>> list(
            @RequestParam(required = false) String namespace,
            @PageableDefault(size = 10) Pageable pageable) {
        UserContext.requirePermission("K8S_READ");
        List<K8sNetworkPolicyResponse> all = TenantNamespaceResolver.applyBlacklist(
            kubernetesClient.listNetworkPolicies(TenantNamespaceResolver.resolveList(namespace)), K8sNetworkPolicyResponse::namespace);
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
        if (dto.podSelectorLabels() != null && !dto.podSelectorLabels().isBlank()) {
            spec.append("  podSelector:\n");
            spec.append("    matchLabels:\n");
            for (String label : dto.podSelectorLabels().split(",")) {
                String[] parts = label.trim().split("=", 2);
                if (parts.length == 2) {
                    spec.append("      ").append(parts[0].trim()).append(": ").append(parts[1].trim()).append("\n");
                }
            }
        } else {
            spec.append("  podSelector: {}\n");
        }

        spec.append("  policyTypes:\n");
        List<String> types = dto.policyTypes();
        if (types == null || types.isEmpty()) types = List.of("Ingress");
        for (String t : types) {
            spec.append("    - ").append(t).append("\n");
        }

        appendDirection(spec, "ingress", "from", dto.ingressRules());
        appendDirection(spec, "egress", "to", dto.egressRules());

        kubernetesClient.createOrUpdateNetworkPolicy(dto.name(), ns, spec.toString());
        K8sNetworkPolicyResponse result = kubernetesClient.getNetworkPolicy(dto.name(), ns);
        if (result == null) {
            result = K8sNetworkPolicyResponse.fromSimulated(dto.name(), ns,
                dto.podSelectorLabels() != null ? dto.podSelectorLabels() : "{}",
                types);
        }
        auditService.record("K8S_NETWORK_POLICY_CREATE", "k8s-network-policy", dto.name(), "Network policy created (name='" + dto.name() + "', namespace='" + ns + "')");
        return ResponseEntity.status(HttpStatus.CREATED).body(result);
    }

    private void appendDirection(StringBuilder spec, String direction, String peerKey,
                                 List<K8sNetworkPolicyRequest.NetworkPolicyRule> rules) {
        if (rules == null || rules.isEmpty()) return;
        spec.append("  ").append(direction).append(":\n");
        for (var rule : rules) {
            spec.append("    - ").append(peerKey).append(":\n");
            if (rule.ipBlocks() != null) {
                for (String ip : rule.ipBlocks()) {
                    spec.append("        - ipBlock:\n");
                    spec.append("            cidr: ").append(ip).append("\n");
                }
            }
            if (rule.namespaceSelectorLabels() != null && !rule.namespaceSelectorLabels().isEmpty()) {
                for (String l : rule.namespaceSelectorLabels()) {
                    String[] parts = l.split("=", 2);
                    spec.append("        - namespaceSelector:\n");
                    spec.append("            matchLabels:\n");
                    spec.append("              ").append(parts[0].trim()).append(": ").append(parts.length > 1 ? parts[1].trim() : "").append("\n");
                }
            }
            if (rule.podSelectorLabels() != null && !rule.podSelectorLabels().isEmpty()) {
                for (String l : rule.podSelectorLabels()) {
                    String[] parts = l.split("=", 2);
                    spec.append("        - podSelector:\n");
                    spec.append("            matchLabels:\n");
                    spec.append("              ").append(parts[0].trim()).append(": ").append(parts.length > 1 ? parts[1].trim() : "").append("\n");
                }
            }
            if (rule.ports() != null) {
                spec.append("      ports:\n");
                for (String port : rule.ports()) {
                    String[] parts = port.split("/", 2);
                    spec.append("        - protocol: ").append(parts.length > 1 ? parts[1] : "TCP").append("\n");
                    spec.append("          port: ").append(parts[0]).append("\n");
                }
            }
        }
    }

    @DeleteMapping("/{name}")
    public ResponseEntity<Void> delete(
            @PathVariable String name,
            @RequestParam(required = false) String namespace) {
        UserContext.requirePermission("K8S_MANAGE");
        kubernetesClient.deleteNetworkPolicy(name, TenantNamespaceResolver.resolve(namespace));
        auditService.record("K8S_NETWORK_POLICY_DELETE", "k8s-network-policy", name, "Network policy deleted (name='" + name + "')");
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/batch")
    public ResponseEntity<Void> deleteBatch(@RequestBody Map<String, List<String>> body) {
        UserContext.requirePermission("K8S_MANAGE");
        List<String> names = body.get("names");
        List<String> nsList = body.getOrDefault("namespace", List.of());
        String namespace = TenantNamespaceResolver.resolve(nsList.isEmpty() ? null : nsList.get(0));
        if (names != null) {
            for (String name : names) {
                kubernetesClient.deleteNetworkPolicy(name, namespace);
            }
            auditService.record("K8S_NETWORK_POLICY_DELETE_BATCH", "k8s-network-policy", null, "Network policies deleted in batch (names=" + names + ")");
        }
        return ResponseEntity.noContent().build();
    }
}
