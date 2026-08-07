package com.cloud_pricer.repository;

import com.cloud_pricer.domain.CostRecord;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface CostRecordRepository extends JpaRepository<CostRecord, UUID> {
    List<CostRecord> findByTenantId(UUID tenantId);
    Page<CostRecord> findByTenantId(UUID tenantId, Pageable pageable);
    List<CostRecord> findByServiceEnvironmentId(UUID serviceEnvironmentId);
    List<CostRecord> findByTenantIdAndServiceEnvironmentId(UUID tenantId, UUID serviceEnvironmentId);

    Optional<CostRecord> findFirstByServiceEnvironmentIdOrderByPeriodEndDesc(UUID serviceEnvironmentId);

    Optional<CostRecord> findByServiceEnvironmentIdAndPeriodStartAndPeriodEndAndMode(
            UUID serviceEnvironmentId,
            java.time.Instant periodStart,
            java.time.Instant periodEnd,
            String mode);

    @Query("""
        SELECT c.tenantId, SUM(c.totalCost), SUM(c.computeCost), SUM(c.storageCost),
               SUM(c.networkCost), SUM(c.backupCost), SUM(c.osCost), COUNT(c)
        FROM CostRecord c GROUP BY c.tenantId ORDER BY SUM(c.totalCost) DESC
    """)
    List<Object[]> aggregateByTenant();

    @Query("""
        SELECT c.tenantId, SUM(c.totalCost), SUM(c.computeCost), SUM(c.storageCost),
               SUM(c.networkCost), SUM(c.backupCost), SUM(c.osCost), COUNT(c)
        FROM CostRecord c WHERE c.tenantId = :tenantId
        GROUP BY c.tenantId ORDER BY SUM(c.totalCost) DESC
    """)
    List<Object[]> aggregateByTenantForTenant(@Param("tenantId") UUID tenantId);

    @Query("""
        SELECT c.serviceEnvironmentId, SUM(c.totalCost), SUM(c.computeCost), SUM(c.storageCost),
               SUM(c.networkCost), SUM(c.backupCost), SUM(c.osCost), COUNT(c)
        FROM CostRecord c GROUP BY c.serviceEnvironmentId ORDER BY SUM(c.totalCost) DESC
    """)
    List<Object[]> aggregateByServiceEnvironment();

    @Query("""
        SELECT FUNCTION('TO_CHAR', c.periodStart, 'YYYY-MM') AS period,
               SUM(c.totalCost), SUM(c.computeCost), SUM(c.storageCost),
               SUM(c.networkCost), SUM(c.backupCost), SUM(c.osCost), COUNT(c)
        FROM CostRecord c GROUP BY FUNCTION('TO_CHAR', c.periodStart, 'YYYY-MM') ORDER BY period DESC
    """)
    List<Object[]> aggregateByPeriod();

    @Query("""
        SELECT FUNCTION('TO_CHAR', c.periodStart, 'YYYY-MM') AS period,
               SUM(c.totalCost), SUM(c.computeCost), SUM(c.storageCost),
               SUM(c.networkCost), SUM(c.backupCost), SUM(c.osCost), COUNT(c)
        FROM CostRecord c WHERE c.tenantId = :tenantId
        GROUP BY FUNCTION('TO_CHAR', c.periodStart, 'YYYY-MM') ORDER BY period DESC
    """)
    List<Object[]> aggregateByPeriodForTenant(@Param("tenantId") UUID tenantId);

    @Query("""
        SELECT c.serviceEnvironmentId, SUM(c.totalCost), SUM(c.computeCost), SUM(c.storageCost),
               SUM(c.networkCost), SUM(c.backupCost), SUM(c.osCost), COUNT(c)
        FROM CostRecord c WHERE c.tenantId = :tenantId
        GROUP BY c.serviceEnvironmentId ORDER BY SUM(c.totalCost) DESC
    """)
    List<Object[]> aggregateByServiceEnvironmentForTenant(@Param("tenantId") UUID tenantId);
}
