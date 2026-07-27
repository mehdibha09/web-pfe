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

    @PostMapping
    public ResponseEntity<DeploymentTemplateResponse> create(@Valid @RequestBody DeploymentTemplateRequest dto) {
        UserContext.requirePermission("DEPLOYMENT_MANAGE");
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(dto));
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
        return ResponseEntity.ok(service.update(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        UserContext.requirePermission("DEPLOYMENT_MANAGE");
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
