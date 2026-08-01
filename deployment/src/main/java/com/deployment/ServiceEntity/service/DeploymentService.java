package com.deployment.ServiceEntity.service;

import com.deployment.ServiceEntity.config.UserContext;
import com.deployment.ServiceEntity.domain.Deployment;
import com.deployment.ServiceEntity.repository.DeploymentRepository;

import java.time.Instant;
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
public class DeploymentService {

  private final DeploymentRepository deploymentRepository;

  public Deployment create(Deployment deployment) {
    return deploymentRepository.save(deployment);
  }

  public Deployment getById(UUID id) {
    return getById(id, UserContext.getTenantId());
  }

  public Deployment getById(UUID id, UUID tenantId) {
    if (tenantId != null && !UserContext.isSuperAdmin()) {
      return deploymentRepository
          .findByIdAndTenant(id, tenantId)
          .orElseThrow(() -> new RuntimeException("Deployment not found"));
    }
    return deploymentRepository
        .findById(id)
        .orElseThrow(() -> new RuntimeException("Deployment not found"));
  }

  public List<Deployment> getAll() {
    return getAll(UserContext.getTenantId());
  }

  public List<Deployment> getAll(UUID tenantId) {
    if (tenantId != null && !UserContext.isSuperAdmin()) {
      return deploymentRepository.findByTenant(tenantId);
    }
    return deploymentRepository.findAll();
  }

  public Page<Deployment> getAll(Pageable pageable) {
    return getAll(UserContext.getTenantId(), pageable);
  }

  public Page<Deployment> getAll(UUID tenantId, Pageable pageable) {
    if (tenantId != null && !UserContext.isSuperAdmin()) {
      return deploymentRepository.findByTenant(tenantId, pageable);
    }
    return deploymentRepository.findAll(pageable);
  }

  public Deployment update(UUID id, Deployment deployment) {
    Deployment existing = getById(id, UserContext.getTenantId());
    if (deployment.getVersion() != null) existing.setVersion(deployment.getVersion());
    if (deployment.getStatus() != null) existing.setStatus(deployment.getStatus());
    if (deployment.getNotes() != null) existing.setNotes(deployment.getNotes());
    if (deployment.getServiceEnvironmentId() != null)
      existing.setServiceEnvironmentId(deployment.getServiceEnvironmentId());
    return deploymentRepository.save(existing);
  }

  public void delete(UUID id) {
    getById(id, UserContext.getTenantId());
    deploymentRepository.deleteById(id);
  }

  public void deleteByServiceEnvironment(UUID serviceEnvironmentId) {
    deploymentRepository.deleteByServiceEnvironmentId(serviceEnvironmentId);
  }

  public Deployment redeploy(UUID id) {
    Deployment existing = getById(id, UserContext.getTenantId());
    log.info("Redeploying deployment {}", id);
    Deployment newDeployment = new Deployment();
    newDeployment.setVersion(existing.getVersion());
    newDeployment.setNotes(existing.getNotes());
    newDeployment.setServiceEnvironmentId(existing.getServiceEnvironmentId());
    newDeployment.setDeployedBy(existing.getDeployedBy());
    newDeployment.setStatus(Deployment.Status.QUEUED);
    newDeployment.setDeployedAt(Instant.now());
    newDeployment.setCreatedAt(Instant.now());
    return deploymentRepository.save(newDeployment);
  }
}
