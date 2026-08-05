package com.deployment.ServiceEntity.service;

import com.deployment.ServiceEntity.config.UserContext;
import com.deployment.ServiceEntity.repository.ServiceEnvironmentRepository;
import com.deployment.ServiceEntity.repository.ServiceRepository;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class ServiceDomainService {

  private final ServiceRepository serviceRepository;
  private final ServiceEnvironmentRepository serviceEnvironmentRepository;
  private final VmService vmService;
  private final K8sDeploymentService k8sDeploymentService;
  private final MetricService metricService;
  private final BackupService backupService;

  public com.deployment.ServiceEntity.domain.Service create(
      com.deployment.ServiceEntity.domain.Service service) {
    return serviceRepository.save(service);
  }

  public com.deployment.ServiceEntity.domain.Service getById(UUID id) {
    com.deployment.ServiceEntity.domain.Service svc = serviceRepository
        .findById(id)
        .orElseThrow(() -> new RuntimeException("Service not found"));
    if (!svc.getTenantId().equals(UserContext.getTenantId())) {
      throw new RuntimeException("Service not found");
    }
    return svc;
  }

  public List<com.deployment.ServiceEntity.domain.Service> getAll() {
    return serviceRepository.findByTenantId(UserContext.getTenantId());
  }

  public Page<com.deployment.ServiceEntity.domain.Service> getAll(Pageable pageable) {
    return serviceRepository.findByTenantId(UserContext.getTenantId(), pageable);
  }

  public com.deployment.ServiceEntity.domain.Service update(
      UUID id, com.deployment.ServiceEntity.domain.Service service) {
    com.deployment.ServiceEntity.domain.Service existing = getById(id);
    if (service.getName() != null) existing.setName(service.getName());
    if (service.getType() != null) existing.setType(service.getType());
    if (service.getStatus() != null) existing.setStatus(service.getStatus());
    if (service.getRuntime() != null) existing.setRuntime(service.getRuntime());
    if (service.getTenantId() != null) existing.setTenantId(service.getTenantId());
    return serviceRepository.save(existing);
  }

  public void delete(UUID id) {
    List<com.deployment.ServiceEntity.domain.ServiceEnvironment> envs =
        serviceEnvironmentRepository.findByServiceId(id);
    for (var env : envs) {
      cascadeDeleteServiceEnvironment(env.getId());
    }
    serviceRepository.deleteById(id);
  }

  private void cascadeDeleteServiceEnvironment(UUID serviceEnvironmentId) {
    metricService.deleteByServiceEnvironment(serviceEnvironmentId);
    backupService.deleteByServiceEnvironment(serviceEnvironmentId);
    k8sDeploymentService.deleteByServiceEnvironment(serviceEnvironmentId);
    vmService.deleteByServiceEnvironment(serviceEnvironmentId);
    serviceEnvironmentRepository.deleteById(serviceEnvironmentId);
  }
}
