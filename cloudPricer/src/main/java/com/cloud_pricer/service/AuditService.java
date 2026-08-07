package com.cloud_pricer.service;

import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.cloud_pricer.config.ClientIpResolver;
import com.cloud_pricer.config.UserContext;
import com.cloud_pricer.domain.AuditLog;
import com.cloud_pricer.repository.AuditLogRepository;

@Service
public class AuditService {

    private static final Logger log = LoggerFactory.getLogger(AuditService.class);

    private final AuditLogRepository auditLogRepository;
    private final ClientIpResolver clientIpResolver;

    public AuditService(AuditLogRepository auditLogRepository, ClientIpResolver clientIpResolver) {
        this.auditLogRepository = auditLogRepository;
        this.clientIpResolver = clientIpResolver;
    }

    @Transactional
    public void record(String action, String resource, String resourceId, String details) {
        try {
            AuditLog auditLog = new AuditLog();
            auditLog.setUserId(UserContext.getUserId());
            auditLog.setTenantId(UserContext.getTenantId());
            auditLog.setAction(action);
            auditLog.setResource(resource);
            auditLog.setResourceId(resourceId);
            auditLog.setDetails(details);
            auditLog.setIpAddress(resolveClientIp());
            auditLogRepository.save(auditLog);
        } catch (Exception e) {
            log.warn("Failed to record audit log action={} resource={} : {}", action, resource, e.getMessage());
        }
    }

    private String resolveClientIp() {
        return clientIpResolver.resolve();
    }
}
