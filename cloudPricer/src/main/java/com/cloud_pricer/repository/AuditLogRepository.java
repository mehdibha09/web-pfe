package com.cloud_pricer.repository;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.cloud_pricer.domain.AuditLog;

public interface AuditLogRepository extends JpaRepository<AuditLog, UUID> {
}
