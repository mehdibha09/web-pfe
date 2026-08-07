package com.cloud_pricer.repository;

import com.cloud_pricer.domain.Quota;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface QuotaRepository extends JpaRepository<Quota, UUID> {
    List<Quota> findByServiceEnvironmentId(UUID serviceEnvironmentId);
    List<Quota> findByServiceEnvironmentIdAndIsActive(UUID serviceEnvironmentId, boolean isActive);
    List<Quota> findByIsActiveTrue();
    List<Quota> findByTenantId(UUID tenantId);
    Page<Quota> findByTenantId(UUID tenantId, Pageable pageable);
}
