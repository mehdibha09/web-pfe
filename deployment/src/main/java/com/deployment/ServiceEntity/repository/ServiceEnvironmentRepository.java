package com.deployment.ServiceEntity.repository;

import com.deployment.ServiceEntity.domain.ServiceEnvironment;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ServiceEnvironmentRepository extends JpaRepository<ServiceEnvironment, UUID> {
    List<ServiceEnvironment> findByServiceId(UUID serviceId);
    List<ServiceEnvironment> findByEnvironmentId(UUID environmentId);
    List<ServiceEnvironment> findByTenantId(UUID tenantId);
    Page<ServiceEnvironment> findByTenantId(UUID tenantId, Pageable pageable);
}
