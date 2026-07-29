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
import com.deployment.ServiceEntity.domain.ServiceEnvironment;
import com.deployment.ServiceEntity.repository.EnvironmentRepository;
import com.deployment.ServiceEntity.repository.ServiceRepository;
import com.deployment.ServiceEntity.service.ServiceEnvironmentService;
import com.deployment.ServiceEntity.web.dto.serviceEnvironment.ServiceEnvironmentCreateDto;
import com.deployment.ServiceEntity.web.dto.serviceEnvironment.ServiceEnvironmentResponseDto;
import com.deployment.ServiceEntity.web.routes.ApiRoutes;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping(ApiRoutes.ServiceEnvironment.BASE)
@RequiredArgsConstructor
public class ServiceEnvironmentController {

  private final ServiceEnvironmentService serviceEnvironmentService;
  private final ServiceRepository serviceRepository;
  private final EnvironmentRepository environmentRepository;

  @PostMapping
  public ResponseEntity<ServiceEnvironmentResponseDto> create(
      @Valid @RequestBody ServiceEnvironmentCreateDto dto) {
    UserContext.requirePermission("DEPLOYMENT_MANAGE");
    ServiceEnvironment serviceEnvironment = new ServiceEnvironment();
    serviceEnvironment.setServiceId(dto.serviceId());
    serviceEnvironment.setEnvironmentId(dto.environmentId());
    serviceEnvironment.setTenantId(UserContext.getTenantId());

    ServiceEnvironment created = serviceEnvironmentService.create(serviceEnvironment);
    return ResponseEntity.status(HttpStatus.CREATED).body(map(created));
  }

  @GetMapping("/{id}")
  public ResponseEntity<ServiceEnvironmentResponseDto> getById(@PathVariable UUID id) {
    UserContext.requirePermission("DEPLOYMENT_READ");
    return ResponseEntity.ok(map(serviceEnvironmentService.getById(id)));
  }

  @GetMapping("/all")
  public ResponseEntity<List<ServiceEnvironmentResponseDto>> getAllUnpaged() {
    UserContext.requirePermission("DEPLOYMENT_READ");
    return ResponseEntity.ok(serviceEnvironmentService.getAll().stream().map(this::map).toList());
  }

  @GetMapping
  public ResponseEntity<Page<ServiceEnvironmentResponseDto>> getAll(@PageableDefault(size = 10) Pageable pageable) {
    UserContext.requirePermission("DEPLOYMENT_READ");
    return ResponseEntity.ok(serviceEnvironmentService.getAll(pageable).map(this::map));
  }

  @PutMapping("/{id}")
  public ResponseEntity<ServiceEnvironmentResponseDto> update(
      @PathVariable UUID id, @Valid @RequestBody ServiceEnvironmentCreateDto dto) {
    UserContext.requirePermission("DEPLOYMENT_MANAGE");
    ServiceEnvironment serviceEnvironment = new ServiceEnvironment();
    serviceEnvironment.setServiceId(dto.serviceId());
    serviceEnvironment.setEnvironmentId(dto.environmentId());
    serviceEnvironment.setTenantId(UserContext.getTenantId());

    return ResponseEntity.ok(map(serviceEnvironmentService.update(id, serviceEnvironment)));
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> delete(@PathVariable UUID id) {
    UserContext.requirePermission("DEPLOYMENT_MANAGE");
    serviceEnvironmentService.delete(id);
    return ResponseEntity.noContent().build();
  }

  private ServiceEnvironmentResponseDto map(ServiceEnvironment se) {
    String serviceName = serviceRepository.findById(se.getServiceId())
        .map(s -> s.getName())
        .orElse(null);
    String environmentName = environmentRepository.findById(se.getEnvironmentId())
        .map(e -> e.getName())
        .orElse(null);
    return new ServiceEnvironmentResponseDto(
        se.getId(),
        se.getServiceId(),
        se.getEnvironmentId(),
        se.getTenantId(),
        serviceName,
        environmentName,
        se.getCreatedAt(),
        se.getUpdatedAt());
  }
}
