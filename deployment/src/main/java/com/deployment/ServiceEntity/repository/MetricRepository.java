package com.deployment.ServiceEntity.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.deployment.ServiceEntity.domain.Metric;

public interface MetricRepository extends JpaRepository<Metric, UUID>, JpaSpecificationExecutor<Metric> {
    java.util.Optional<Metric> findTopByServiceEnvironmentIdOrderByCreatedAtDesc(
            UUID serviceEnvironmentId);

    java.util.List<Metric> findByServiceEnvironmentId(UUID serviceEnvironmentId);

    List<Metric> findByVmIdOrderByTimestampDesc(UUID vmId);

    @Query("""
            select m from Metric m
            where m.serviceEnvironmentId in (
                select se.id from ServiceEnvironment se where se.tenantId = :tenantId
            )
            order by m.timestamp desc
            """)
    List<Metric> findByTenant(@Param("tenantId") UUID tenantId);

    @Query("""
            select m from Metric m
            where m.serviceEnvironmentId in (
                select se.id from ServiceEnvironment se where se.tenantId = :tenantId
            )
            """)
    Page<Metric> findByTenant(@Param("tenantId") UUID tenantId, Pageable pageable);

    @Query("""
            select m from Metric m
            where m.id = :id
              and m.serviceEnvironmentId in (
                select se.id from ServiceEnvironment se where se.tenantId = :tenantId
            )
            """)
    java.util.Optional<Metric> findByIdAndTenant(@Param("id") UUID id, @Param("tenantId") UUID tenantId);

    void deleteByServiceEnvironmentId(UUID serviceEnvironmentId);

    void deleteByVmId(UUID vmId);

    @Query("""
                SELECT
                    AVG(m.cpuUsage),
                    MAX(m.cpuUsage),
                    MIN(m.cpuUsage),

                    AVG(m.ramUsage),
                    MAX(m.ramUsage),
                    MIN(m.ramUsage),

                    AVG(m.networkUsage),
                    MAX(m.networkUsage),
                    MIN(m.networkUsage),

                    AVG(m.diskUsage),
                    MAX(m.diskUsage),
                    MIN(m.diskUsage),

                    SUM(m.pods),
                    COUNT(m)
                FROM Metric m
                WHERE m.serviceEnvironmentId = :id
            """)
    Object getSummary(@Param("id") UUID id);
}
