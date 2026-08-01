package com.deployment.ServiceEntity.web.controller;

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
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.deployment.ServiceEntity.config.UserContext;
import com.deployment.ServiceEntity.service.AuditService;
import com.deployment.ServiceEntity.service.DeploymentTemplateService;
import com.deployment.ServiceEntity.web.dto.k8s.DeploymentTemplateRequest;
import com.deployment.ServiceEntity.web.dto.k8s.DeploymentTemplateResponse;
import com.deployment.ServiceEntity.web.routes.ApiRoutes;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping(ApiRoutes.DeploymentTemplate.BASE)
@RequiredArgsConstructor
public class DeploymentTemplateController {

    private final DeploymentTemplateService service;
    private final AuditService auditService;

    @PostMapping
    public ResponseEntity<DeploymentTemplateResponse> create(@Valid @RequestBody DeploymentTemplateRequest dto) {
        UserContext.requirePermission("DEPLOYMENT_MANAGE");
        DeploymentTemplateResponse created = service.create(dto);
        auditService.record("DEPLOYMENT_TEMPLATE_CREATE", "deployment-template", created.id().toString(), "Deployment template created (name='" + created.name() + "')");
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @GetMapping
    public ResponseEntity<Page<DeploymentTemplateResponse>> getAll(@PageableDefault(size = 10) Pageable pageable) {
        UserContext.requirePermission("DEPLOYMENT_READ");
        return ResponseEntity.ok(service.getAll(UserContext.getTenantId(), pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<DeploymentTemplateResponse> getById(@PathVariable UUID id) {
        UserContext.requirePermission("DEPLOYMENT_READ");
        return ResponseEntity.ok(service.getById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<DeploymentTemplateResponse> update(@PathVariable UUID id, @Valid @RequestBody DeploymentTemplateRequest dto) {
        UserContext.requirePermission("DEPLOYMENT_MANAGE");
        DeploymentTemplateResponse updated = service.update(id, dto);
        auditService.record("DEPLOYMENT_TEMPLATE_UPDATE", "deployment-template", updated.id().toString(), "Deployment template updated (name='" + updated.name() + "')");
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        UserContext.requirePermission("DEPLOYMENT_MANAGE");
        service.delete(id);
        auditService.record("DEPLOYMENT_TEMPLATE_DELETE", "deployment-template", id.toString(), "Deployment template deleted (id=" + id + ")");
        return ResponseEntity.noContent().build();
    }
}
