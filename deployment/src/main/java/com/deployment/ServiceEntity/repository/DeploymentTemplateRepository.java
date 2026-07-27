package com.deployment.ServiceEntity.repository;

import com.deployment.ServiceEntity.domain.DeploymentTemplate;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DeploymentTemplateRepository extends JpaRepository<DeploymentTemplate, UUID> {
    List<DeploymentTemplate> findByTenantId(UUID tenantId);
    Page<DeploymentTemplate> findByTenantId(UUID tenantId, Pageable pageable);
}
