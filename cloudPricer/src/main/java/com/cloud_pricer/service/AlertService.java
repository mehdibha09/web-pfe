package com.cloud_pricer.service;

import com.cloud_pricer.config.UserContext;
import com.cloud_pricer.domain.Alert;
import com.cloud_pricer.exception.ApiException;
import com.cloud_pricer.repository.AlertRepository;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class AlertService {

    private final AlertRepository alertRepository;

    public Alert create(Alert alert) {
        Alert saved = alertRepository.save(alert);
        log.info("Created alert {} severity={} type={}", saved.getId(), saved.getSeverity(), saved.getType());
        return saved;
    }

    public Alert getById(UUID id) {
        return alertRepository.findById(id)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Alert not found"));
    }

    public List<Alert> getAll() {
        return alertRepository.findByTenantId(UserContext.getTenantId());
    }

    public List<Alert> getByTenantId(UUID tenantId) {
        return alertRepository.findByTenantId(tenantId);
    }

    public List<Alert> getByTenantIdAndStatus(UUID tenantId, String status) {
        return alertRepository.findByTenantIdAndStatus(tenantId, status);
    }

    public List<Alert> getByTenantIdAndSeverity(UUID tenantId, String severity) {
        return alertRepository.findByTenantIdAndSeverity(tenantId, severity);
    }

    public List<Alert> getByStatus(String status) {
        return alertRepository.findByTenantIdAndStatus(UserContext.getTenantId(), status);
    }

    public List<Alert> getBySeverity(String severity) {
        return alertRepository.findByTenantIdAndSeverity(UserContext.getTenantId(), severity);
    }

    public List<Alert> getByServiceEnvironmentId(UUID serviceEnvironmentId) {
        return alertRepository.findByServiceEnvironmentId(serviceEnvironmentId);
    }

    public Alert acknowledge(UUID id, UUID acknowledgedBy) {
        Alert alert = getById(id);
        alert.setStatus("ACK");
        alert.setAcknowledgedBy(acknowledgedBy.toString());
        Alert saved = alertRepository.save(alert);
        log.info("Alert {} acknowledged by {}", id, acknowledgedBy);
        return saved;
    }

    public Alert resolve(UUID id) {
        Alert alert = getById(id);
        alert.setStatus("RESOLVED");
        alert.setResolvedAt(Instant.now());
        Alert saved = alertRepository.save(alert);
        log.info("Alert {} resolved", id);
        return saved;
    }

    public void delete(UUID id) {
        alertRepository.deleteById(id);
        log.info("Deleted alert {}", id);
    }
}
