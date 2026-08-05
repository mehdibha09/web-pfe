package com.deployment.ServiceEntity.service;

import com.deployment.ServiceEntity.config.UserContext;
import com.deployment.ServiceEntity.domain.Environment;
import com.deployment.ServiceEntity.exception.ApiException;
import com.deployment.ServiceEntity.repository.EnvironmentRepository;
import com.deployment.ServiceEntity.repository.ServiceEnvironmentRepository;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EnvironmentService {

  private final EnvironmentRepository environmentRepository;
  private final ServiceEnvironmentRepository serviceEnvironmentRepository;
  private final VmService vmService;
  private final K8sDeploymentService k8sDeploymentService;
  private final MetricService metricService;
  private final BackupService backupService;

  public Environment create(Environment environment) {
    UUID tenantId = environment.getTenantId() != null ? environment.getTenantId() : UserContext.getTenantId();
    if (environment.getName() != null && !environment.getName().isBlank()) {
      boolean duplicate = environmentRepository.findByTenantId(tenantId).stream()
          .anyMatch(existing -> existing.getName().equalsIgnoreCase(environment.getName().trim()));
      if (duplicate) {
        throw new ApiException(HttpStatus.CONFLICT, "ENVIRONMENT_NAME_ALREADY_EXISTS",
            "An environment with this name already exists");
      }
    }
    return environmentRepository.save(environment);
  }

  public Environment getById(UUID id) {
    Environment env = environmentRepository
        .findById(id)
        .orElseThrow(() -> new RuntimeException("Environment not found"));
    if (!env.getTenantId().equals(UserContext.getTenantId())) {
      throw new RuntimeException("Environment not found");
    }
    return env;
  }

  public List<Environment> getAll() {
    return environmentRepository.findByTenantId(UserContext.getTenantId());
  }

  public Page<Environment> getAll(Pageable pageable) {
    return environmentRepository.findByTenantId(UserContext.getTenantId(), pageable);
  }

  public Environment update(UUID id, Environment environment) {
    Environment existing = getById(id);
    if (environment.getName() != null) {
      boolean duplicate = environmentRepository.findByTenantId(existing.getTenantId()).stream()
          .anyMatch(candidate -> !candidate.getId().equals(id)
              && candidate.getName().equalsIgnoreCase(environment.getName().trim()));
      if (duplicate) {
        throw new ApiException(HttpStatus.CONFLICT, "ENVIRONMENT_NAME_ALREADY_EXISTS",
            "An environment with this name already exists");
      }
      existing.setName(environment.getName());
    }
    if (environment.getDescription() != null) existing.setDescription(environment.getDescription());
    if (environment.getTenantId() != null) existing.setTenantId(environment.getTenantId());
    return environmentRepository.save(existing);
  }

  public void delete(UUID id) {
    List<com.deployment.ServiceEntity.domain.ServiceEnvironment> envs =
        serviceEnvironmentRepository.findByEnvironmentId(id);
    for (var env : envs) {
      metricService.deleteByServiceEnvironment(env.getId());
      backupService.deleteByServiceEnvironment(env.getId());
      k8sDeploymentService.deleteByServiceEnvironment(env.getId());
      vmService.deleteByServiceEnvironment(env.getId());
      serviceEnvironmentRepository.deleteById(env.getId());
    }
    environmentRepository.deleteById(id);
  }
}
