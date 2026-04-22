package com.auth.auth.repository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.auth.auth.domain.AuditLog;

public interface AuditLogRepository extends JpaRepository<AuditLog, UUID> {
    List<AuditLog> findByTenant_IdAndTimestampBetween(UUID tenantId, Instant from, Instant to);
    List<AuditLog> findByTenant_IdOrderByTimestampDesc(UUID tenantId);
}
