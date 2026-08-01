package com.deployment.ServiceEntity.web.controller;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.data.domain.Page;
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

import com.deployment.ServiceEntity.config.UserContext;
import com.deployment.ServiceEntity.service.AuditService;
import com.deployment.ServiceEntity.service.K8sDeploymentService;
import com.deployment.ServiceEntity.web.dto.k8s.K8sDeploymentRequest;
import com.deployment.ServiceEntity.web.dto.k8s.K8sDeploymentResponse;
import com.deployment.ServiceEntity.web.dto.k8s.K8sHpaRequest;
import com.deployment.ServiceEntity.web.dto.k8s.K8sHpaResponse;
import com.deployment.ServiceEntity.web.dto.k8s.K8sPodResponse;
import com.deployment.ServiceEntity.web.dto.k8s.K8sScaleRequest;
import com.deployment.ServiceEntity.web.routes.ApiRoutes;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping(ApiRoutes.K8s.BASE)
@RequiredArgsConstructor
public class K8sDeploymentController {

    private final K8sDeploymentService k8sDeploymentService;
    private final AuditService auditService;

    @PostMapping
    public ResponseEntity<K8sDeploymentResponse> create(@Valid @RequestBody K8sDeploymentRequest dto) {
        UserContext.requirePermission("K8S_MANAGE");
        K8sDeploymentResponse created = k8sDeploymentService.create(dto);
        auditService.record("K8S_DEPLOYMENT_CREATE", "k8s-deployment", created.id().toString(), "K8s deployment created (name='" + created.name() + "')");
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @GetMapping
    public ResponseEntity<Page<K8sDeploymentResponse>> getAll(@PageableDefault(size = 10) Pageable pageable) {
        UserContext.requirePermission("K8S_READ");
        return ResponseEntity.ok(k8sDeploymentService.getAll(UserContext.getTenantId(), pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<K8sDeploymentResponse> getById(@PathVariable UUID id) {
        UserContext.requirePermission("K8S_READ");
        return ResponseEntity.ok(k8sDeploymentService.getById(id, UserContext.getTenantId()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        UserContext.requirePermission("K8S_MANAGE");
        k8sDeploymentService.delete(id, UserContext.getTenantId());
        auditService.record("K8S_DEPLOYMENT_DELETE", "k8s-deployment", id.toString(), "K8s deployment deleted (id=" + id + ")");
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/scale")
    public ResponseEntity<K8sDeploymentResponse> scale(
            @PathVariable UUID id,
            @Valid @RequestBody K8sScaleRequest dto) {
        UserContext.requirePermission("K8S_MANAGE");
        K8sDeploymentResponse scaled = k8sDeploymentService.scale(id, dto.replicas(), UserContext.getTenantId());
        auditService.record("K8S_DEPLOYMENT_SCALE", "k8s-deployment", scaled.id().toString(),
            "K8s deployment scaled (name='" + scaled.name() + "', replicas=" + dto.replicas() + ")");
        return ResponseEntity.ok(scaled);
    }

    @PostMapping("/{id}/rollback")
    public ResponseEntity<K8sDeploymentResponse> rollback(
            @PathVariable UUID id,
            @RequestBody(required = false) Map<String, Integer> body) {
        UserContext.requirePermission("K8S_MANAGE");
        Integer revision = body != null ? body.get("revision") : null;
        K8sDeploymentResponse rolledBack = k8sDeploymentService.rollback(id, revision, UserContext.getTenantId());
        auditService.record("K8S_DEPLOYMENT_ROLLBACK", "k8s-deployment", rolledBack.id().toString(),
            "K8s deployment rolled back (name='" + rolledBack.name() + "', revision=" + revision + ")");
        return ResponseEntity.ok(rolledBack);
    }

    @PostMapping("/{id}/restart")
    public ResponseEntity<K8sDeploymentResponse> restart(@PathVariable UUID id) {
        UserContext.requirePermission("K8S_MANAGE");
        K8sDeploymentResponse restarted = k8sDeploymentService.restart(id, UserContext.getTenantId());
        auditService.record("K8S_DEPLOYMENT_RESTART", "k8s-deployment", restarted.id().toString(), "K8s deployment restarted (name='" + restarted.name() + "')");
        return ResponseEntity.ok(restarted);
    }

    @GetMapping("/{id}/status")
    public ResponseEntity<Map<String, Object>> getStatus(@PathVariable UUID id) {
        UserContext.requirePermission("K8S_READ");
        return ResponseEntity.ok(k8sDeploymentService.getStatus(id, UserContext.getTenantId()));
    }

    @GetMapping("/{id}/pods")
    public ResponseEntity<List<K8sPodResponse>> getPods(@PathVariable UUID id) {
        UserContext.requirePermission("K8S_READ");
        return ResponseEntity.ok(k8sDeploymentService.getPods(id, UserContext.getTenantId()));
    }

    @GetMapping("/{id}/logs")
    public ResponseEntity<Map<String, String>> getLogs(@PathVariable UUID id) {
        UserContext.requirePermission("K8S_READ");
        return ResponseEntity.ok(Map.of("logs", k8sDeploymentService.getLogs(id, UserContext.getTenantId())));
    }

    @GetMapping("/{id}/events")
    public ResponseEntity<Map<String, String>> getEvents(@PathVariable UUID id) {
        UserContext.requirePermission("K8S_READ");
        return ResponseEntity.ok(Map.of("events", k8sDeploymentService.getEvents(id, UserContext.getTenantId())));
    }

    @PostMapping("/{id}/hpa")
    public ResponseEntity<K8sHpaResponse> configureHpa(
            @PathVariable UUID id,
            @Valid @RequestBody K8sHpaRequest dto) {
        UserContext.requirePermission("K8S_MANAGE");
        K8sHpaResponse hpa = k8sDeploymentService.configureHpa(id, dto, UserContext.getTenantId());
        auditService.record("K8S_DEPLOYMENT_HPA_CONFIG", "k8s-deployment", id.toString(),
            "K8s deployment HPA configured (min=" + dto.minReplicas() + ", max=" + dto.maxReplicas() + ")");
        return ResponseEntity.ok(hpa);
    }

    @GetMapping("/{id}/hpa")
    public ResponseEntity<K8sHpaResponse> getHpa(@PathVariable UUID id) {
        UserContext.requirePermission("K8S_READ");
        K8sHpaResponse hpa = k8sDeploymentService.getHpa(id, UserContext.getTenantId());
        if (hpa == null) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(hpa);
    }

    @DeleteMapping("/{id}/hpa")
    public ResponseEntity<Void> removeHpa(@PathVariable UUID id) {
        UserContext.requirePermission("K8S_MANAGE");
        k8sDeploymentService.removeHpa(id, UserContext.getTenantId());
        auditService.record("K8S_DEPLOYMENT_HPA_REMOVE", "k8s-deployment", id.toString(), "K8s deployment HPA removed (id=" + id + ")");
        return ResponseEntity.noContent().build();
    }
}