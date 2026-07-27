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
import com.deployment.ServiceEntity.domain.Environment;
import com.deployment.ServiceEntity.service.EnvironmentService;
import com.deployment.ServiceEntity.web.dto.environment.EnvironmentCreateDto;
import com.deployment.ServiceEntity.web.dto.environment.EnvironmentResponseDto;
import com.deployment.ServiceEntity.web.routes.ApiRoutes;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping(ApiRoutes.Environment.BASE)
@RequiredArgsConstructor
public class EnvironmentController {

  private final EnvironmentService environmentService;

  @PostMapping
  public ResponseEntity<EnvironmentResponseDto> create(@Valid @RequestBody EnvironmentCreateDto dto) {
    UserContext.requirePermission("DEPLOYMENT_MANAGE");
    Environment environment = new Environment();
    environment.setName(dto.name());
    environment.setDescription(dto.description());
    environment.setTenantId(UserContext.getTenantId());

    Environment created = environmentService.create(environment);
    return ResponseEntity.status(HttpStatus.CREATED).body(map(created));
  }

  @GetMapping("/{id}")
  public ResponseEntity<EnvironmentResponseDto> getById(@PathVariable UUID id) {
    UserContext.requirePermission("DEPLOYMENT_READ");
    return ResponseEntity.ok(map(environmentService.getById(id)));
  }

  @GetMapping
  public ResponseEntity<Page<EnvironmentResponseDto>> getAll(@PageableDefault(size = 10) Pageable pageable) {
    UserContext.requirePermission("DEPLOYMENT_READ");
    return ResponseEntity.ok(environmentService.getAll(pageable).map(this::map));
  }

  @PutMapping("/{id}")
  public ResponseEntity<EnvironmentResponseDto> update(
      @PathVariable UUID id, @Valid @RequestBody EnvironmentCreateDto dto) {
    UserContext.requirePermission("DEPLOYMENT_MANAGE");
    Environment environment = new Environment();
    environment.setName(dto.name());
    environment.setDescription(dto.description());
    environment.setTenantId(UserContext.getTenantId());

    return ResponseEntity.ok(map(environmentService.update(id, environment)));
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> delete(@PathVariable UUID id) {
    UserContext.requirePermission("DEPLOYMENT_MANAGE");
    environmentService.delete(id);
    return ResponseEntity.noContent().build();
  }

  private EnvironmentResponseDto map(Environment environment) {
    return new EnvironmentResponseDto(
        environment.getId(),
        environment.getName(),
        environment.getDescription(),
        environment.getTenantId(),
        environment.getCreatedAt(),
        environment.getUpdatedAt());
  }
}
