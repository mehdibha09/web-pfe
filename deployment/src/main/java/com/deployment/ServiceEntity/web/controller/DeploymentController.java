package com.deployment.ServiceEntity.web.controller;

import java.time.Instant;
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
import com.deployment.ServiceEntity.domain.Deployment;
import com.deployment.ServiceEntity.exception.ApiException;
import com.deployment.ServiceEntity.service.DeploymentService;
import com.deployment.ServiceEntity.web.dto.deployment.DeploymentCreateDto;
import com.deployment.ServiceEntity.web.dto.deployment.DeploymentResponseDto;
import com.deployment.ServiceEntity.web.routes.ApiRoutes;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping(ApiRoutes.Deployment.BASE)
@RequiredArgsConstructor
public class DeploymentController {

  private final DeploymentService deploymentService;

  @PostMapping
  public ResponseEntity<DeploymentResponseDto> create(@Valid @RequestBody DeploymentCreateDto dto) {
    UserContext.requirePermission("DEPLOYMENT_MANAGE");
    Deployment deployment = new Deployment();
    deployment.setVersion(dto.version());
    deployment.setNotes(dto.notes());
    deployment.setStatus(parseStatus(dto.status()));
    deployment.setDeployedBy(UserContext.getUserId());
    deployment.setServiceEnvironmentId(dto.serviceEnvironmentId());
    deployment.setDeployedAt(Instant.now());

    Deployment created = deploymentService.create(deployment);
    return ResponseEntity.status(HttpStatus.CREATED).body(map(created));
  }

  @GetMapping("/{id}")
  public ResponseEntity<DeploymentResponseDto> getById(@PathVariable UUID id) {
    UserContext.requirePermission("DEPLOYMENT_READ");
    return ResponseEntity.ok(map(deploymentService.getById(id)));
  }

  @GetMapping
  public ResponseEntity<Page<DeploymentResponseDto>> getAll(@PageableDefault(size = 10) Pageable pageable) {
    UserContext.requirePermission("DEPLOYMENT_READ");
    return ResponseEntity.ok(deploymentService.getAll(pageable).map(this::map));
  }

  @PutMapping("/{id}")
  public ResponseEntity<DeploymentResponseDto> update(
      @PathVariable UUID id, @Valid @RequestBody DeploymentCreateDto dto) {
    UserContext.requirePermission("DEPLOYMENT_MANAGE");
    Deployment deployment = new Deployment();
    deployment.setVersion(dto.version());
    deployment.setNotes(dto.notes());
    deployment.setStatus(parseStatus(dto.status()));
    deployment.setDeployedBy(UserContext.getUserId());
    deployment.setServiceEnvironmentId(dto.serviceEnvironmentId());

    return ResponseEntity.ok(map(deploymentService.update(id, deployment)));
  }

  @PostMapping("/{id}/redeploy")
  public ResponseEntity<DeploymentResponseDto> redeploy(@PathVariable UUID id) {
    UserContext.requirePermission("DEPLOYMENT_MANAGE");
    return ResponseEntity.status(HttpStatus.CREATED).body(map(deploymentService.redeploy(id)));
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> delete(@PathVariable UUID id) {
    UserContext.requirePermission("DEPLOYMENT_MANAGE");
    deploymentService.delete(id);
    return ResponseEntity.noContent().build();
  }

  private DeploymentResponseDto map(Deployment deployment) {
    return new DeploymentResponseDto(
        deployment.getId(),
        deployment.getVersion(),
        deployment.getStatus().name(),
        deployment.getNotes(),
        deployment.getServiceEnvironmentId(),
        deployment.getDeployedAt(),
        deployment.getCreatedAt(),
        deployment.getUpdatedAt());
  }

  private Deployment.Status parseStatus(String status) {
    if (status == null || status.isBlank()) {
      return Deployment.Status.QUEUED;
    }

    String normalized = status.trim().toUpperCase();
    if ("PENDING".equals(normalized)) {
      return Deployment.Status.QUEUED;
    }

    try {
      return Deployment.Status.valueOf(normalized);
    } catch (IllegalArgumentException ex) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "BAD_REQUEST", "Invalid status: " + status);
    }
  }
}
