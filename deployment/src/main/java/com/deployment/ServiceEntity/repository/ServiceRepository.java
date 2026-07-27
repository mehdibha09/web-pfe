package com.deployment.ServiceEntity.repository;

import com.deployment.ServiceEntity.domain.Service;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ServiceRepository extends JpaRepository<Service, UUID> {
    List<Service> findByTenantId(UUID tenantId);
    Page<Service> findByTenantId(UUID tenantId, Pageable pageable);
}
