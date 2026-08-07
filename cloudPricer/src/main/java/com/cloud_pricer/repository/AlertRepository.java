package com.cloud_pricer.repository;

import com.cloud_pricer.domain.Alert;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AlertRepository extends JpaRepository<Alert, UUID> {
    List<Alert> findByTenantId(UUID tenantId);
    Page<Alert> findByTenantId(UUID tenantId, Pageable pageable);
    List<Alert> findByStatus(String status);
    List<Alert> findBySeverity(String severity);
    List<Alert> findByServiceEnvironmentId(UUID serviceEnvironmentId);
    List<Alert> findByTenantIdAndStatus(UUID tenantId, String status);
    List<Alert> findByTenantIdAndSeverity(UUID tenantId, String severity);
}
