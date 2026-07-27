package com.deployment.ServiceEntity.repository;

import com.deployment.ServiceEntity.domain.K8sDeployment;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface K8sDeploymentRepository extends JpaRepository<K8sDeployment, UUID> {

    List<K8sDeployment> findByServiceEnvironmentId(UUID serviceEnvironmentId);

    List<K8sDeployment> findByTenantId(UUID tenantId);
    Page<K8sDeployment> findByTenantId(UUID tenantId, Pageable pageable);
    Page<K8sDeployment> findByServiceEnvironmentId(UUID serviceEnvironmentId, Pageable pageable);

    void deleteByServiceEnvironmentId(UUID serviceEnvironmentId);
}
