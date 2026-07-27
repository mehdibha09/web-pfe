package com.deployment.ServiceEntity.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.deployment.ServiceEntity.domain.Metric;

public interface MetricRepository extends JpaRepository<Metric, UUID>, JpaSpecificationExecutor<Metric> {
    java.util.Optional<Metric> findTopByServiceEnvironmentIdOrderByCreatedAtDesc(
            UUID serviceEnvironmentId);

    java.util.List<Metric> findByServiceEnvironmentId(UUID serviceEnvironmentId);

    java.util.List<Metric> findByTenantId(UUID tenantId);

    List<Metric> findByVmIdOrderByTimestampDesc(UUID vmId);

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
