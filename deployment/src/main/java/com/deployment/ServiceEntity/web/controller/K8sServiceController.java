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
import com.deployment.ServiceEntity.domain.KubernetesClient;
import com.deployment.ServiceEntity.service.AuditService;
import com.deployment.ServiceEntity.web.dto.k8s.K8sServiceRequest;
import com.deployment.ServiceEntity.web.dto.k8s.K8sServiceResponse;
import com.deployment.ServiceEntity.service.TenantNamespaceResolver;
import com.deployment.ServiceEntity.web.routes.ApiRoutes;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping(ApiRoutes.K8sService.BASE)
@RequiredArgsConstructor
public class K8sServiceController {

    private final KubernetesClient kubernetesClient;
    private final AuditService auditService;

    @GetMapping
    public ResponseEntity<Page<K8sServiceResponse>> list(
            @RequestParam(required = false) String namespace,
            @PageableDefault(size = 10) Pageable pageable) {
        UserContext.requirePermission("K8S_READ");
        List<K8sServiceResponse> all = kubernetesClient.listServices(namespace);
        int start = (int) pageable.getOffset();
        int end = Math.min(start + pageable.getPageSize(), all.size());
        List<K8sServiceResponse> content = start < all.size() ? all.subList(start, end) : List.of();
        return ResponseEntity.ok(new PageImpl<>(content, pageable, all.size()));
    }

    @GetMapping("/{name}")
    public ResponseEntity<K8sServiceResponse> get(
            @PathVariable String name,
            @RequestParam(required = false) String namespace) {
        UserContext.requirePermission("K8S_READ");
        K8sServiceResponse svc = kubernetesClient.getService(name, TenantNamespaceResolver.resolve(namespace));
        if (svc == null) return ResponseEntity.noContent().build();
        return ResponseEntity.ok(svc);
    }

    @PostMapping
    public ResponseEntity<K8sServiceResponse> create(
            @Valid @RequestBody K8sServiceRequest dto) {
        UserContext.requirePermission("K8S_MANAGE");
        String ns = TenantNamespaceResolver.resolve(dto.namespace());
        String svcType = dto.type() != null ? dto.type() : "ClusterIP";
        String protocol = dto.protocol() != null ? dto.protocol() : "TCP";
        int targetPort = dto.targetPort() != null ? dto.targetPort() : dto.port();
        Map<String, String> selector = dto.selector() != null ? dto.selector() : Map.of("app", dto.name());

        StringBuilder yamlSpec = new StringBuilder();
        yamlSpec.append("  type: ").append(svcType).append("\n");
        yamlSpec.append("  selector:\n");
        for (var entry : selector.entrySet()) {
            yamlSpec.append("    ").append(entry.getKey()).append(": ").append(entry.getValue()).append("\n");
        }
        yamlSpec.append("  ports:\n");
        yamlSpec.append("    - protocol: ").append(protocol).append("\n");
        yamlSpec.append("      port: ").append(dto.port()).append("\n");
        yamlSpec.append("      targetPort: ").append(targetPort).append("\n");

        if (dto.labels() != null && !dto.labels().isEmpty()) {
            yamlSpec.append("  metadata:\n    labels:\n");
            for (var entry : dto.labels().entrySet()) {
                yamlSpec.append("      ").append(entry.getKey()).append(": ").append(entry.getValue()).append("\n");
            }
        }

        kubernetesClient.createOrUpdateService(dto.name(), ns, yamlSpec.toString());
        K8sServiceResponse result = kubernetesClient.getService(dto.name(), ns);
        if (result == null) {
            result = K8sServiceResponse.fromSimulated(dto.name(), ns, svcType, dto.port(), targetPort, selector);
        }
        auditService.record("K8S_SERVICE_CREATE", "k8s-service", dto.name(), "K8s service created (name='" + dto.name() + "', namespace='" + ns + "', type='" + svcType + "')");
        return ResponseEntity.status(HttpStatus.CREATED).body(result);
    }

    @PutMapping("/{name}")
    public ResponseEntity<K8sServiceResponse> update(
            @PathVariable String name,
            @Valid @RequestBody K8sServiceRequest dto) {
        UserContext.requirePermission("K8S_MANAGE");
        String ns = TenantNamespaceResolver.resolve(dto.namespace());

        StringBuilder yamlSpec = new StringBuilder();
        yamlSpec.append("  selector:\n");
        if (dto.selector() != null) {
            for (var entry : dto.selector().entrySet()) {
                yamlSpec.append("    ").append(entry.getKey()).append(": ").append(entry.getValue()).append("\n");
            }
        } else {
            yamlSpec.append("    app: ").append(dto.name()).append("\n");
        }
        yamlSpec.append("  ports:\n");
        yamlSpec.append("    - protocol: ").append(dto.protocol() != null ? dto.protocol() : "TCP").append("\n");
        yamlSpec.append("      port: ").append(dto.port()).append("\n");
        yamlSpec.append("      targetPort: ").append(dto.targetPort() != null ? dto.targetPort() : dto.port()).append("\n");

        kubernetesClient.createOrUpdateService(name, ns, yamlSpec.toString());
        K8sServiceResponse result = kubernetesClient.getService(name, ns);
        if (result == null) {
            Map<String, String> sel = dto.selector() != null ? dto.selector() : Map.of("app", name);
            result = K8sServiceResponse.fromSimulated(name, ns, "ClusterIP", dto.port(), dto.targetPort() != null ? dto.targetPort() : dto.port(), sel);
        }
        auditService.record("K8S_SERVICE_UPDATE", "k8s-service", name, "K8s service updated (name='" + name + "', namespace='" + ns + "')");
        return ResponseEntity.ok(result);
    }

    @DeleteMapping("/{name}")
    public ResponseEntity<Void> delete(
            @PathVariable String name,
            @RequestParam(required = false) String namespace) {
        UserContext.requirePermission("K8S_MANAGE");
        kubernetesClient.deleteService(name, TenantNamespaceResolver.resolve(namespace));
        auditService.record("K8S_SERVICE_DELETE", "k8s-service", name, "K8s service deleted (name='" + name + "')");
        return ResponseEntity.noContent().build();
    }
}