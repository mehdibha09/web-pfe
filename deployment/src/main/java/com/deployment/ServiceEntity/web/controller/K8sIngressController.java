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
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.deployment.ServiceEntity.config.UserContext;
import com.deployment.ServiceEntity.domain.KubernetesClient;
import com.deployment.ServiceEntity.service.AuditService;
import com.deployment.ServiceEntity.web.dto.k8s.K8sIngressRequest;
import com.deployment.ServiceEntity.web.dto.k8s.K8sIngressResponse;
import com.deployment.ServiceEntity.service.TenantNamespaceResolver;
import com.deployment.ServiceEntity.web.routes.ApiRoutes;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping(ApiRoutes.K8sIngress.BASE)
@RequiredArgsConstructor
public class K8sIngressController {

    private final KubernetesClient kubernetesClient;
    private final AuditService auditService;

    @GetMapping
    public ResponseEntity<Page<K8sIngressResponse>> list(
            @RequestParam(required = false) String namespace,
            @PageableDefault(size = 10) Pageable pageable) {
        UserContext.requirePermission("K8S_READ");
        List<K8sIngressResponse> all = kubernetesClient.listIngresses(namespace);
        int start = (int) pageable.getOffset();
        int end = Math.min(start + pageable.getPageSize(), all.size());
        List<K8sIngressResponse> content = start < all.size() ? all.subList(start, end) : List.of();
        return ResponseEntity.ok(new PageImpl<>(content, pageable, all.size()));
    }

    @GetMapping("/{name}")
    public ResponseEntity<K8sIngressResponse> get(
            @PathVariable String name,
            @RequestParam(required = false) String namespace) {
        UserContext.requirePermission("K8S_READ");
        K8sIngressResponse ing = kubernetesClient.getIngress(name, TenantNamespaceResolver.resolve(namespace));
        if (ing == null) return ResponseEntity.noContent().build();
        return ResponseEntity.ok(ing);
    }

    @PostMapping
    public ResponseEntity<K8sIngressResponse> create(
            @Valid @RequestBody K8sIngressRequest dto) {
        UserContext.requirePermission("K8S_MANAGE");
        String ns = TenantNamespaceResolver.resolve(dto.namespace());

        StringBuilder yamlSpec = new StringBuilder();
        if (dto.ingressClassName() != null) {
            yamlSpec.append("  ingressClassName: ").append(dto.ingressClassName()).append("\n");
        }

        // TLS
        if (dto.tls() != null && !dto.tls().isEmpty()) {
            yamlSpec.append("  tls:\n");
            for (var t : dto.tls()) {
                yamlSpec.append("    - hosts:\n");
                if (t.hosts() != null) {
                    for (var h : t.hosts()) {
                        yamlSpec.append("        - ").append(h).append("\n");
                    }
                }
                if (t.secretName() != null) {
                    yamlSpec.append("      secretName: ").append(t.secretName()).append("\n");
                }
            }
        }

        // Rules
        yamlSpec.append("  rules:\n");
        if (dto.rules() != null) {
            for (var r : dto.rules()) {
                if (r.host() != null && !r.host().isBlank()) {
                    yamlSpec.append("    - host: ").append(r.host()).append("\n");
                } else {
                    yamlSpec.append("    - host: ''\n");
                }
                yamlSpec.append("      http:\n");
                yamlSpec.append("        paths:\n");
                if (r.paths() != null) {
                    for (var p : r.paths()) {
                        yamlSpec.append("          - path: ").append(p.path() != null ? p.path() : "/").append("\n");
                        yamlSpec.append("            pathType: ").append(p.pathType() != null ? p.pathType() : "Prefix").append("\n");
                        yamlSpec.append("            backend:\n");
                        yamlSpec.append("              service:\n");
                        yamlSpec.append("                name: ").append(p.serviceName()).append("\n");
                        yamlSpec.append("                port:\n");
                        yamlSpec.append("                  number: ").append(p.servicePort()).append("\n");
                    }
                }
            }
        }

        kubernetesClient.createOrUpdateIngress(dto.name(), ns, yamlSpec.toString());
        K8sIngressResponse result = kubernetesClient.getIngress(dto.name(), ns);
        if (result == null) {
            String host = dto.rules() != null && !dto.rules().isEmpty() ? dto.rules().get(0).host() : "";
            String svcName = dto.rules() != null && !dto.rules().isEmpty()
                && dto.rules().get(0).paths() != null && !dto.rules().get(0).paths().isEmpty()
                ? dto.rules().get(0).paths().get(0).serviceName() : "";
            int svcPort = dto.rules() != null && !dto.rules().isEmpty()
                && dto.rules().get(0).paths() != null && !dto.rules().get(0).paths().isEmpty()
                ? dto.rules().get(0).paths().get(0).servicePort() : 80;
            result = K8sIngressResponse.fromSimulated(dto.name(), ns, host, svcName, svcPort);
        }
        auditService.record("K8S_INGRESS_CREATE", "k8s-ingress", dto.name(), "Ingress created (name='" + dto.name() + "', namespace='" + ns + "')");
        return ResponseEntity.status(HttpStatus.CREATED).body(result);
    }

    @PutMapping("/{name}")
    public ResponseEntity<K8sIngressResponse> update(
            @PathVariable String name,
            @Valid @RequestBody K8sIngressRequest dto) {
        UserContext.requirePermission("K8S_MANAGE");
        String ns = TenantNamespaceResolver.resolve(dto.namespace());
        // Reuse same YAML building
        StringBuilder yamlSpec = new StringBuilder();
        if (dto.ingressClassName() != null) {
            yamlSpec.append("  ingressClassName: ").append(dto.ingressClassName()).append("\n");
        }
        if (dto.tls() != null && !dto.tls().isEmpty()) {
            yamlSpec.append("  tls:\n");
            for (var t : dto.tls()) {
                yamlSpec.append("    - hosts:\n");
                if (t.hosts() != null) {
                    for (var h : t.hosts()) {
                        yamlSpec.append("        - ").append(h).append("\n");
                    }
                }
                if (t.secretName() != null) {
                    yamlSpec.append("      secretName: ").append(t.secretName()).append("\n");
                }
            }
        }
        yamlSpec.append("  rules:\n");
        if (dto.rules() != null) {
            for (var r : dto.rules()) {
                yamlSpec.append("    - host: ").append(r.host() != null ? r.host() : "").append("\n");
                yamlSpec.append("      http:\n");
                yamlSpec.append("        paths:\n");
                if (r.paths() != null) {
                    for (var p : r.paths()) {
                        yamlSpec.append("          - path: ").append(p.path() != null ? p.path() : "/").append("\n");
                        yamlSpec.append("            pathType: ").append(p.pathType() != null ? p.pathType() : "Prefix").append("\n");
                        yamlSpec.append("            backend:\n");
                        yamlSpec.append("              service:\n");
                        yamlSpec.append("                name: ").append(p.serviceName()).append("\n");
                        yamlSpec.append("                port:\n");
                        yamlSpec.append("                  number: ").append(p.servicePort()).append("\n");
                    }
                }
            }
        }

        kubernetesClient.createOrUpdateIngress(name, ns, yamlSpec.toString());
        K8sIngressResponse result = kubernetesClient.getIngress(name, ns);
        if (result == null) {
            result = K8sIngressResponse.fromSimulated(name, ns, "", "", 80);
        }
        auditService.record("K8S_INGRESS_UPDATE", "k8s-ingress", name, "Ingress updated (name='" + name + "', namespace='" + ns + "')");
        return ResponseEntity.ok(result);
    }

    @DeleteMapping("/{name}")
    public ResponseEntity<Void> delete(
            @PathVariable String name,
            @RequestParam(required = false) String namespace) {
        UserContext.requirePermission("K8S_MANAGE");
        kubernetesClient.deleteIngress(name, TenantNamespaceResolver.resolve(namespace));
        auditService.record("K8S_INGRESS_DELETE", "k8s-ingress", name, "Ingress deleted (name='" + name + "')");
        return ResponseEntity.noContent().build();
    }
}