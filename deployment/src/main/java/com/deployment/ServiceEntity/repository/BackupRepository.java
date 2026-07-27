package com.deployment.ServiceEntity.repository;

import com.deployment.ServiceEntity.domain.Backup;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface BackupRepository extends JpaRepository<Backup, UUID> {

    List<Backup> findByVmId(UUID vmId);

    List<Backup> findByServiceEnvironmentId(UUID serviceEnvironmentId);

    List<Backup> findByTenantId(UUID tenantId);
    Page<Backup> findByTenantId(UUID tenantId, Pageable pageable);
    Page<Backup> findByVmId(UUID vmId, Pageable pageable);
    Page<Backup> findByServiceEnvironmentId(UUID serviceEnvironmentId, Pageable pageable);

    List<Backup> findByVmIdOrderByCreatedAtDesc(UUID vmId);

    void deleteByVmId(UUID vmId);

    void deleteByServiceEnvironmentId(UUID serviceEnvironmentId);
}
