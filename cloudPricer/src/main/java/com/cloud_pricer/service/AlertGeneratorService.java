package com.cloud_pricer.service;

import java.util.List;
import java.util.UUID;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import com.cloud_pricer.domain.Alert;
import com.cloud_pricer.domain.CostRecord;
import com.cloud_pricer.domain.Quota;
import com.cloud_pricer.domain.ServiceEnvironment;
import com.cloud_pricer.repository.AlertRepository;
import com.cloud_pricer.repository.CostRecordRepository;
import com.cloud_pricer.repository.QuotaRepository;
import com.cloud_pricer.repository.ServiceEnvironmentRepository;
import com.cloud_pricer.web.dto.cost.MetricSnapshot;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class AlertGeneratorService {

    private final QuotaRepository quotaRepository;
    private final AlertRepository alertRepository;
    private final ServiceEnvironmentRepository serviceEnvironmentRepository;
    private final CostRecordRepository costRecordRepository;
    private final String deploymentServiceBaseUrl;
    private final RestClient restClient;

    public AlertGeneratorService(QuotaRepository quotaRepository,
                                 AlertRepository alertRepository,
                                 ServiceEnvironmentRepository serviceEnvironmentRepository,
                                 CostRecordRepository costRecordRepository,
                                 @org.springframework.beans.factory.annotation.Value(
                                         "${deployment-service-url:http://localhost:8082}") String deploymentServiceBaseUrl) {
        this.quotaRepository = quotaRepository;
        this.alertRepository = alertRepository;
        this.serviceEnvironmentRepository = serviceEnvironmentRepository;
        this.costRecordRepository = costRecordRepository;
        this.deploymentServiceBaseUrl = deploymentServiceBaseUrl;
        this.restClient = RestClient.builder()
                .baseUrl(deploymentServiceBaseUrl)
                .build();
    }

    private static final double WARN_CPU = 80.0;
    private static final double CRIT_CPU = 90.0;
    private static final double WARN_RAM = 80.0;
    private static final double CRIT_RAM = 90.0;
    private static final double WARN_DISK = 85.0;
    private static final double CRIT_DISK = 95.0;

    @Scheduled(fixedRateString = "${alert.check.interval:60000}", initialDelay = 30000)
    public void checkQuotas() {
        List<Quota> activeQuotas = quotaRepository.findByIsActiveTrue();
        if (activeQuotas.isEmpty()) {
            return;
        }

        log.info("Running quota check for {} active quotas", activeQuotas.size());

        for (Quota quota : activeQuotas) {
            try {
                checkSingleQuota(quota);
                ServiceEnvironment seForBudget = serviceEnvironmentRepository.findById(quota.getServiceEnvironmentId()).orElse(null);
                UUID budgetTenant = seForBudget != null ? seForBudget.getTenantId() : UUID.randomUUID();
                checkBudget(quota.getServiceEnvironmentId(), budgetTenant, quota.getMaxBudget());
            } catch (Exception e) {
                log.warn("Failed to check quota {} for service-env {}: {}",
                        quota.getId(), quota.getServiceEnvironmentId(), e.getMessage());
            }
        }

        log.info("Quota check complete");
    }

    private void checkSingleQuota(Quota quota) {
        UUID seId = quota.getServiceEnvironmentId();

        MetricSnapshot metric;
        try {
            metric = restClient.get()
                    .uri("/api/v1/metrics/latest/{seId}", seId)
                    .retrieve()
                    .body(MetricSnapshot.class);
        } catch (Exception e) {
            log.debug("No metrics available for service-env {}", seId);
            return;
        }

        if (metric == null) {
            return;
        }

        ServiceEnvironment se = serviceEnvironmentRepository.findById(seId).orElse(null);
        UUID tenantId = se != null ? se.getTenantId() : UUID.randomUUID();

        checkMetric(seId, tenantId, "CPU", metric.cpuUsage(), quota.getMaxCpu(), "percent");
        checkMetric(seId, tenantId, "RAM", metric.ramUsage(), quota.getMaxRam(), "percent");
        checkMetric(seId, tenantId, "DISK", metric.diskUsage(), quota.getMaxStorage(), "percent");
        checkPods(seId, tenantId, metric.pods(), quota.getMaxPods());
    }

    private void checkMetric(UUID seId, UUID tenantId, String metricName, double actual, double threshold, String unit) {
        if (threshold <= 0) return;

        double ratio = (actual / threshold) * 100.0;

        if (ratio >= CRIT_CPU && !hasOpenAlert(seId, metricName, "CRITICAL")) {
            createAlert(seId, tenantId, metricName, threshold, actual, "CRITICAL",
                    metricName + " usage at " + String.format("%.1f", actual) + unit
                            + " — exceeds " + String.format("%.1f", threshold) + unit + " threshold (critical)");
        } else if (ratio >= WARN_CPU && !hasOpenAlert(seId, metricName, "WARNING")) {
            createAlert(seId, tenantId, metricName, threshold, actual, "WARNING",
                    metricName + " usage at " + String.format("%.1f", actual) + unit
                            + " — approaching " + String.format("%.1f", threshold) + unit + " threshold (warning)");
        }
    }

    private void checkPods(UUID seId, UUID tenantId, int actualPods, int maxPods) {
        if (maxPods <= 0) return;

        double ratio = ((double) actualPods / maxPods) * 100.0;

        if (ratio >= CRIT_CPU && !hasOpenAlert(seId, "PODS", "CRITICAL")) {
            createAlert(seId, tenantId, "PODS", maxPods, actualPods, "CRITICAL",
                    "Pod count at " + actualPods + " — exceeds limit of " + maxPods + " (critical)");
        } else if (ratio >= WARN_CPU && !hasOpenAlert(seId, "PODS", "WARNING")) {
            createAlert(seId, tenantId, "PODS", maxPods, actualPods, "WARNING",
                    "Pod count at " + actualPods + " — approaching limit of " + maxPods + " (warning)");
        }
    }

    private void checkBudget(UUID seId, UUID tenantId, double maxBudget) {
        if (maxBudget <= 0) return;

        double usedCost = costRecordRepository.findByServiceEnvironmentId(seId).stream()
                .mapToDouble(CostRecord::getTotalCost)
                .sum();

        double ratio = (usedCost / maxBudget) * 100.0;

        if (ratio >= 100.0 && !hasOpenAlert(seId, "BUDGET", "CRITICAL")) {
            createAlert(seId, tenantId, "BUDGET", maxBudget, usedCost, "CRITICAL",
                    "Budget épuisé — " + String.format("%.2f", usedCost) + " / " + String.format("%.2f", maxBudget)
                            + " (" + String.format("%.0f", ratio) + "%). Dépenses au-delà du budget alloué.");
        } else if (ratio >= 90.0 && !hasOpenAlert(seId, "BUDGET", "WARNING")) {
            createAlert(seId, tenantId, "BUDGET", maxBudget, usedCost, "WARNING",
                    "Budget presque épuisé — " + String.format("%.0f", ratio) + "% utilisé (" + String.format("%.2f", usedCost) + " / " + String.format("%.2f", maxBudget) + ")");
        } else if (ratio >= 80.0 && !hasOpenAlert(seId, "BUDGET", "INFO")) {
            createAlert(seId, tenantId, "BUDGET", maxBudget, usedCost, "INFO",
                    "Vous avez utilisé " + String.format("%.0f", ratio) + "% de votre budget (" + String.format("%.2f", usedCost) + " / " + String.format("%.2f", maxBudget) + ")");
        }
    }

    private boolean hasOpenAlert(UUID serviceEnvironmentId, String metric, String severity) {
        return alertRepository.findByServiceEnvironmentId(serviceEnvironmentId)
                .stream()
                .anyMatch(a -> a.getMetric().equals(metric)
                        && a.getSeverity().equals(severity)
                        && ("OPEN".equals(a.getStatus()) || "ACK".equals(a.getStatus())));
    }

    private void createAlert(UUID seId, UUID tenantId, String metric, double threshold, double actual,
                             String severity, String message) {
        Alert alert = new Alert();
        alert.setTenantId(tenantId);
        alert.setServiceEnvironmentId(seId);
        alert.setType("QUOTA");
        alert.setMetric(metric);
        alert.setThreshold(threshold);
        alert.setActualValue(actual);
        alert.setSeverity(severity);
        alert.setStatus("OPEN");
        alert.setMessage(message);
        alertRepository.save(alert);
        log.warn("AUTO-ALERT created: {} {} actual={} threshold={} se={}",
                severity, metric, actual, threshold, seId);
    }
}
