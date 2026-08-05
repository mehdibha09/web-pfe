package com.deployment.ServiceEntity.repository;

import java.time.Instant;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.deployment.ServiceEntity.domain.AuditLog;

public interface AuditLogRepository extends JpaRepository<AuditLog, UUID> {

    @Query("""
            select a from AuditLog a
            where a.tenantId = :tenantId
            order by a.timestamp desc
            """)
    Page<AuditLog> findByTenantId(@Param("tenantId") UUID tenantId, Pageable pageable);

    @Query(value = """
            select *
            from audit_logs a
            where (:tenantId is null or a.tenant_id = cast(:tenantId as uuid))
              and (:action is null or a.action ilike '%' || cast(:action as text) || '%')
              and (:resource is null or a.resource ilike '%' || cast(:resource as text) || '%')
              and a.timestamp >= cast(:from as timestamptz)
              and a.timestamp <= cast(:to as timestamptz)
            order by a.timestamp desc
            """, countQuery = """
            select count(*)
            from audit_logs a
            where (:tenantId is null or a.tenant_id = cast(:tenantId as uuid))
              and (:action is null or a.action ilike '%' || cast(:action as text) || '%')
              and (:resource is null or a.resource ilike '%' || cast(:resource as text) || '%')
              and a.timestamp >= cast(:from as timestamptz)
              and a.timestamp <= cast(:to as timestamptz)
            """, nativeQuery = true)
    Page<AuditLog> search(
            @Param("tenantId") UUID tenantId,
            @Param("action") String action,
            @Param("resource") String resource,
            @Param("from") Instant from,
            @Param("to") Instant to,
            Pageable pageable);

    @Query(value = """
            select *
            from audit_logs a
            where (:tenantId is null or a.tenant_id = cast(:tenantId as uuid))
              and (:action is null or a.action ilike '%' || cast(:action as text) || '%')
              and (:resource is null or a.resource ilike '%' || cast(:resource as text) || '%')
              and a.timestamp >= cast(:from as timestamptz)
              and a.timestamp <= cast(:to as timestamptz)
              and a.user_id = :userId
            order by a.timestamp desc
            """, countQuery = """
            select count(*)
            from audit_logs a
            where (:tenantId is null or a.tenant_id = cast(:tenantId as uuid))
              and (:action is null or a.action ilike '%' || cast(:action as text) || '%')
              and (:resource is null or a.resource ilike '%' || cast(:resource as text) || '%')
              and a.timestamp >= cast(:from as timestamptz)
              and a.timestamp <= cast(:to as timestamptz)
              and a.user_id = :userId
            """, nativeQuery = true)
    Page<AuditLog> searchByUser(
            @Param("tenantId") UUID tenantId,
            @Param("action") String action,
            @Param("resource") String resource,
            @Param("from") Instant from,
            @Param("to") Instant to,
            @Param("userId") UUID userId,
            Pageable pageable);
}
