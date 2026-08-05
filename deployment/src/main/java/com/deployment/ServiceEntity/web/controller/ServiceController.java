package com.deployment.ServiceEntity.web.controller;

import java.util.List;
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
import com.deployment.ServiceEntity.exception.ApiException;
import com.deployment.ServiceEntity.service.AuditService;
import com.deployment.ServiceEntity.service.ServiceDomainService;
import com.deployment.ServiceEntity.web.dto.service.ServiceCreateDto;
import com.deployment.ServiceEntity.web.dto.service.ServiceResponseDto;
import com.deployment.ServiceEntity.web.routes.ApiRoutes;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping(ApiRoutes.ServiceApi.BASE)
@RequiredArgsConstructor
public class ServiceController {

  private final ServiceDomainService serviceDomainService;
  private final AuditService auditService;

  @PostMapping
  public ResponseEntity<ServiceResponseDto> create(@Valid @RequestBody ServiceCreateDto dto) {
    UserContext.requirePermission("DEPLOYMENT_MANAGE");
    com.deployment.ServiceEntity.domain.Service svc = new com.deployment.ServiceEntity.domain.Service();
    svc.setName(dto.name());
    svc.setType(dto.type());
    svc.setStatus(com.deployment.ServiceEntity.domain.Service.Status.ACTIVE);
    svc.setRuntime(parseRuntime(dto.runtime()));
    svc.setTenantId(UserContext.getTenantId());

    com.deployment.ServiceEntity.domain.Service created = serviceDomainService.create(svc);
    auditService.record("SERVICE_CREATE", "service", created.getId().toString(), "Service '" + created.getName() + "' created (runtime=" + created.getRuntime() + ")");
    return ResponseEntity.status(HttpStatus.CREATED).body(map(created));
  }

  @GetMapping("/{id}")
  public ResponseEntity<ServiceResponseDto> getById(@PathVariable UUID id) {
    UserContext.requirePermission("DEPLOYMENT_READ");
    return ResponseEntity.ok(map(serviceDomainService.getById(id)));
  }

  @GetMapping("/all")
  public ResponseEntity<List<ServiceResponseDto>> getAllUnpaged() {
    UserContext.requirePermission("DEPLOYMENT_READ");
    return ResponseEntity.ok(serviceDomainService.getAll().stream().map(this::map).toList());
  }

  @GetMapping
  public ResponseEntity<Page<ServiceResponseDto>> getAll(@PageableDefault(size = 10) Pageable pageable) {
    UserContext.requirePermission("DEPLOYMENT_READ");
    return ResponseEntity.ok(serviceDomainService.getAll(pageable).map(this::map));
  }

  @PutMapping("/{id}")
  public ResponseEntity<ServiceResponseDto> update(
      @PathVariable UUID id, @Valid @RequestBody ServiceCreateDto dto) {
    UserContext.requirePermission("DEPLOYMENT_MANAGE");
    com.deployment.ServiceEntity.domain.Service svc = new com.deployment.ServiceEntity.domain.Service();
    svc.setName(dto.name());
    svc.setType(dto.type());
    svc.setRuntime(parseRuntime(dto.runtime()));
    svc.setTenantId(UserContext.getTenantId());

    com.deployment.ServiceEntity.domain.Service updated = serviceDomainService.update(id, svc);
    auditService.record("SERVICE_UPDATE", "service", updated.getId().toString(), "Service '" + updated.getName() + "' updated");
    return ResponseEntity.ok(map(updated));
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> delete(@PathVariable UUID id) {
    UserContext.requirePermission("DEPLOYMENT_MANAGE");
    serviceDomainService.delete(id);
    auditService.record("SERVICE_DELETE", "service", id.toString(), "Service deleted (id=" + id + ")");
    return ResponseEntity.noContent().build();
  }

  private ServiceResponseDto map(com.deployment.ServiceEntity.domain.Service svc) {
    return new ServiceResponseDto(
        svc.getId(),
        svc.getName(),
        svc.getType(),
        svc.getStatus().name(),
        svc.getRuntime() != null ? svc.getRuntime().name() : null,
        svc.getTenantId(),
        svc.getCreatedAt(),
        svc.getUpdatedAt());
  }

  private com.deployment.ServiceEntity.domain.Service.Runtime parseRuntime(String runtime) {
    if (runtime == null || runtime.isBlank()) {
      return com.deployment.ServiceEntity.domain.Service.Runtime.VAGRANT;
    }
    try {
      return com.deployment.ServiceEntity.domain.Service.Runtime.valueOf(
          runtime.trim().toUpperCase());
    } catch (IllegalArgumentException ex) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "BAD_REQUEST", "Invalid runtime: " + runtime);
    }
  }
}
