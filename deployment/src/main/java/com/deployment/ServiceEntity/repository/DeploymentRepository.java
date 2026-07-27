package com.deployment.ServiceEntity.repository;

import com.deployment.ServiceEntity.domain.Deployment;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DeploymentRepository extends JpaRepository<Deployment, UUID> {
    List<Deployment> findByServiceEnvironmentId(UUID serviceEnvironmentId);
    List<Deployment> findByTenantId(UUID tenantId);
    Page<Deployment> findByTenantId(UUID tenantId, Pageable pageable);
    Page<Deployment> findByServiceEnvironmentId(UUID serviceEnvironmentId, Pageable pageable);
    void deleteByServiceEnvironmentId(UUID serviceEnvironmentId);
}
