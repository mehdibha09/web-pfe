package com.auth.auth.repository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.auth.auth.domain.AuditLog;

public interface AuditLogRepository extends JpaRepository<AuditLog, UUID> {
    List<AuditLog> findByTenant_IdAndTimestampBetween(UUID tenantId, Instant from, Instant to);
    List<AuditLog> findByTenant_IdOrderByTimestampDesc(UUID tenantId);

        @Query("""
                        select distinct lower(a.resource)
                        from AuditLog a
                        where a.tenant.id = :tenantId
                            and a.resource is not null
                            and trim(a.resource) <> ''
                        order by lower(a.resource)
                        """)
        List<String> findDistinctResourcesByTenantId(@Param("tenantId") UUID tenantId);
}
