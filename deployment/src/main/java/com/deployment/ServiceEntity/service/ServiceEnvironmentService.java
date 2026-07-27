package com.deployment.ServiceEntity.service;

import com.deployment.ServiceEntity.config.UserContext;
import com.deployment.ServiceEntity.domain.ServiceEnvironment;
import com.deployment.ServiceEntity.repository.ServiceEnvironmentRepository;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class ServiceEnvironmentService {

  private final ServiceEnvironmentRepository serviceEnvironmentRepository;
  private final VmService vmService;
  private final DeploymentService deploymentService;
  private final K8sDeploymentService k8sDeploymentService;
  private final MetricService metricService;
  private final BackupService backupService;

  public ServiceEnvironment create(ServiceEnvironment serviceEnvironment) {
    return serviceEnvironmentRepository.save(serviceEnvironment);
  }

  public ServiceEnvironment getById(UUID id) {
    ServiceEnvironment se = serviceEnvironmentRepository
        .findById(id)
        .orElseThrow(() -> new RuntimeException("ServiceEnvironment not found"));
    if (!se.getTenantId().equals(UserContext.getTenantId())) {
      throw new RuntimeException("ServiceEnvironment not found");
    }
    return se;
  }

  public List<ServiceEnvironment> getAll() {
    return serviceEnvironmentRepository.findByTenantId(UserContext.getTenantId());
  }

  public Page<ServiceEnvironment> getAll(Pageable pageable) {
    return serviceEnvironmentRepository.findByTenantId(UserContext.getTenantId(), pageable);
  }

  public ServiceEnvironment update(UUID id, ServiceEnvironment serviceEnvironment) {
    ServiceEnvironment existing = getById(id);
    if (serviceEnvironment.getServiceId() != null)
      existing.setServiceId(serviceEnvironment.getServiceId());
    if (serviceEnvironment.getEnvironmentId() != null)
      existing.setEnvironmentId(serviceEnvironment.getEnvironmentId());
    if (serviceEnvironment.getTenantId() != null)
      existing.setTenantId(serviceEnvironment.getTenantId());
    return serviceEnvironmentRepository.save(existing);
  }

  public void delete(UUID id) {
    metricService.deleteByServiceEnvironment(id);
    backupService.deleteByServiceEnvironment(id);
    k8sDeploymentService.deleteByServiceEnvironment(id);
    vmService.deleteByServiceEnvironment(id);
    deploymentService.deleteByServiceEnvironment(id);
    serviceEnvironmentRepository.deleteById(id);
  }
}
