package com.deployment.ServiceEntity.repository;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.deployment.ServiceEntity.domain.AuditLog;

public interface AuditLogRepository extends JpaRepository<AuditLog, UUID> {
}
