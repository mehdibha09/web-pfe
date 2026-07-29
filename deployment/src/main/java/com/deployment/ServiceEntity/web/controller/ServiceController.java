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

  @PostMapping
  public ResponseEntity<ServiceResponseDto> create(@Valid @RequestBody ServiceCreateDto dto) {
    UserContext.requirePermission("DEPLOYMENT_MANAGE");
    com.deployment.ServiceEntity.domain.Service svc = new com.deployment.ServiceEntity.domain.Service();
    svc.setName(dto.name());
    svc.setType(dto.type());
    svc.setStatus(parseStatus(dto.status()));
    svc.setTenantId(UserContext.getTenantId());

    com.deployment.ServiceEntity.domain.Service created = serviceDomainService.create(svc);
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
    svc.setStatus(parseStatus(dto.status()));
    svc.setTenantId(UserContext.getTenantId());

    return ResponseEntity.ok(map(serviceDomainService.update(id, svc)));
  }

  @PostMapping("/{id}/start")
  public ResponseEntity<ServiceResponseDto> start(@PathVariable UUID id) {
    UserContext.requirePermission("DEPLOYMENT_MANAGE");
    return ResponseEntity.ok(map(serviceDomainService.start(id)));
  }

  @PostMapping("/{id}/stop")
  public ResponseEntity<ServiceResponseDto> stop(@PathVariable UUID id) {
    UserContext.requirePermission("DEPLOYMENT_MANAGE");
    return ResponseEntity.ok(map(serviceDomainService.stop(id)));
  }

  @PostMapping("/{id}/restart")
  public ResponseEntity<ServiceResponseDto> restart(@PathVariable UUID id) {
    UserContext.requirePermission("DEPLOYMENT_MANAGE");
    return ResponseEntity.ok(map(serviceDomainService.restart(id)));
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> delete(@PathVariable UUID id) {
    UserContext.requirePermission("DEPLOYMENT_MANAGE");
    serviceDomainService.delete(id);
    return ResponseEntity.noContent().build();
  }

  private ServiceResponseDto map(com.deployment.ServiceEntity.domain.Service svc) {
    return new ServiceResponseDto(
        svc.getId(),
        svc.getName(),
        svc.getType(),
        svc.getStatus().name(),
        svc.getTenantId(),
        svc.getCreatedAt(),
        svc.getUpdatedAt());
  }

  private com.deployment.ServiceEntity.domain.Service.Status parseStatus(String status) {
    if (status == null || status.isBlank()) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "BAD_REQUEST", "status is required");
    }

    try {
      return com.deployment.ServiceEntity.domain.Service.Status.valueOf(
          status.trim().toUpperCase());
    } catch (IllegalArgumentException ex) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "BAD_REQUEST", "Invalid status: " + status);
    }
  }
}
