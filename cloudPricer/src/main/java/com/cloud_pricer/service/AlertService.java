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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class AlertService {

    private final AlertRepository alertRepository;

    public Alert getById(UUID id) {
        return alertRepository.findById(id)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Alert not found"));
    }

    public List<Alert> getAll() {
        return alertRepository.findByTenantId(UserContext.getTenantId());
    }

    public Page<Alert> getPageByTenantId(UUID tenantId, Pageable pageable) {
        return alertRepository.findByTenantId(tenantId, pageable);
    }

    public List<Alert> getByTenantIdAndStatus(UUID tenantId, String status) {
        return alertRepository.findByTenantIdAndStatus(tenantId, status);
    }

    public List<Alert> getByTenantIdAndSeverity(UUID tenantId, String severity) {
        return alertRepository.findByTenantIdAndSeverity(tenantId, severity);
    }

    public Alert acknowledge(UUID id, UUID acknowledgedBy) {
        Alert alert = getOwnedById(id);
        alert.setStatus("ACK");
        alert.setAcknowledgedBy(acknowledgedBy.toString());
        Alert saved = alertRepository.save(alert);
        log.info("Alert {} acknowledged by {}", id, acknowledgedBy);
        return saved;
    }

    public Alert resolve(UUID id) {
        Alert alert = getOwnedById(id);
        alert.setStatus("RESOLVED");
        alert.setResolvedAt(Instant.now());
        Alert saved = alertRepository.save(alert);
        log.info("Alert {} resolved", id);
        return saved;
    }

    public void delete(UUID id) {
        Alert alert = getOwnedById(id);
        alertRepository.delete(alert);
        log.info("Deleted alert {}", id);
    }

    /**
     * Charge une alerte en s'assurant qu'elle appartient au tenant de l'appelant.
     * Renvoie 404 (et non 403) pour ne pas révéler l'existence d'alertes
     * appartenant à un autre tenant (prévention IDOR cross-tenant).
     */
    private Alert getOwnedById(UUID id) {
        Alert alert = getById(id);
        UUID currentTenant = UserContext.getTenantId();
        if (currentTenant == null || !currentTenant.equals(alert.getTenantId())) {
            log.warn("Tenant {} attempted to mutate alert {} owned by tenant {} — denied",
                    currentTenant, id, alert.getTenantId());
            throw new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Alert not found");
        }
        return alert;
    }
}
