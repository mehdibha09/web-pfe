package com.deployment.ServiceEntity.repository;

import com.deployment.ServiceEntity.domain.Environment;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface EnvironmentRepository extends JpaRepository<Environment, UUID> {
    List<Environment> findByTenantId(UUID tenantId);
    Page<Environment> findByTenantId(UUID tenantId, Pageable pageable);
}
