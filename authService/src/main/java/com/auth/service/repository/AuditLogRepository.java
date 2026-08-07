package com.auth.service.repository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.auth.service.domain.AuditLog;

public interface AuditLogRepository extends JpaRepository<AuditLog, UUID> {
    List<AuditLog> findByTenant_IdAndTimestampBetween(UUID tenantId, Instant from, Instant to);
    List<AuditLog> findByTimestampBetween(Instant from, Instant to);
    List<AuditLog> findByTenant_IdOrderByTimestampDesc(UUID tenantId);

        @Query(value = """
                        select a from AuditLog a
                        where (:tenantId is null or a.tenant.id = :tenantId)
                          and a.timestamp between :from and :to
                          and (:action is null or lower(a.action) = lower(:action))
                          and (:resource is null or lower(a.resource) = lower(:resource))
                          and (:userId is null or (a.user is not null and a.user.id = :userId))
                        order by a.timestamp desc
                        """,
                countQuery = """
                        select count(a) from AuditLog a
                        where (:tenantId is null or a.tenant.id = :tenantId)
                          and a.timestamp between :from and :to
                          and (:action is null or lower(a.action) = lower(:action))
                          and (:resource is null or lower(a.resource) = lower(:resource))
                          and (:userId is null or (a.user is not null and a.user.id = :userId))
                        """)
        Page<AuditLog> search(@Param("tenantId") UUID tenantId,
                              @Param("from") Instant from,
                              @Param("to") Instant to,
                              @Param("action") String action,
                              @Param("resource") String resource,
                              @Param("userId") UUID userId,
                              Pageable pageable);

        @Query("""
                        select distinct lower(a.resource)
                        from AuditLog a
                        where a.tenant.id = :tenantId
                            and a.resource is not null
                            and trim(a.resource) <> ''
                        order by lower(a.resource)
                        """)
        List<String> findDistinctResourcesByTenantId(@Param("tenantId") UUID tenantId);

        @Query("""
                        select distinct lower(a.resource)
                        from AuditLog a
                        where a.resource is not null
                            and trim(a.resource) <> ''
                        order by lower(a.resource)
                        """)
        List<String> findDistinctResources();

        @Query("""
                        select distinct lower(a.action)
                        from AuditLog a
                        where a.tenant.id = :tenantId
                            and a.action is not null
                            and trim(a.action) <> ''
                        order by lower(a.action)
                        """)
        List<String> findDistinctActionsByTenantId(@Param("tenantId") UUID tenantId);

        @Query("""
                        select distinct lower(a.action)
                        from AuditLog a
                        where a.action is not null
                            and trim(a.action) <> ''
                        order by lower(a.action)
                        """)
        List<String> findDistinctActions();
}
