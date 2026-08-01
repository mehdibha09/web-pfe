package com.deployment.ServiceEntity.repository;

import com.deployment.ServiceEntity.domain.Deployment;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface DeploymentRepository extends JpaRepository<Deployment, UUID> {
    List<Deployment> findByServiceEnvironmentId(UUID serviceEnvironmentId);
    Page<Deployment> findByServiceEnvironmentId(UUID serviceEnvironmentId, Pageable pageable);
    void deleteByServiceEnvironmentId(UUID serviceEnvironmentId);

    @Query("""
            select d from Deployment d
            where d.serviceEnvironmentId in (
                select se.id from ServiceEnvironment se where se.tenantId = :tenantId
            )
            """)
    Page<Deployment> findByTenant(@Param("tenantId") UUID tenantId, Pageable pageable);

    @Query("""
            select d from Deployment d
            where d.serviceEnvironmentId in (
                select se.id from ServiceEnvironment se where se.tenantId = :tenantId
            )
            """)
    List<Deployment> findByTenant(@Param("tenantId") UUID tenantId);

    @Query("""
            select d from Deployment d
            where d.id = :id
              and d.serviceEnvironmentId in (
                select se.id from ServiceEnvironment se where se.tenantId = :tenantId
            )
            """)
    java.util.Optional<Deployment> findByIdAndTenant(@Param("id") UUID id, @Param("tenantId") UUID tenantId);
}
