package com.cloud_pricer.service;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import com.cloud_pricer.config.IdentitySigner;
import com.cloud_pricer.domain.Alert;
import com.cloud_pricer.domain.CostRecord;
import com.cloud_pricer.domain.K8sDeployment;
import com.cloud_pricer.domain.Quota;
import com.cloud_pricer.domain.ServiceEnvironment;
import com.cloud_pricer.domain.Vm;
import com.cloud_pricer.repository.AlertRepository;
import com.cloud_pricer.repository.CostRecordRepository;
import com.cloud_pricer.repository.K8sDeploymentRepository;
import com.cloud_pricer.repository.QuotaRepository;
import com.cloud_pricer.repository.ServiceEnvironmentRepository;
import com.cloud_pricer.repository.VmRepository;
import com.cloud_pricer.web.dto.quota.QuotaUsageResponse;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class AlertGeneratorService {

    private final QuotaRepository quotaRepository;
    private final AlertRepository alertRepository;
    private final ServiceEnvironmentRepository serviceEnvironmentRepository;
    private final CostRecordRepository costRecordRepository;
    private final QuotaService quotaService;
    private final VmRepository vmRepository;
    private final K8sDeploymentRepository k8sDeploymentRepository;
    private final IdentitySigner identitySigner;
    private final RestClient deploymentRestClient;

    @Value("${alert.auto-stop.grace-ms:120000}")
    private long autoStopGraceMs;

    public AlertGeneratorService(QuotaRepository quotaRepository,
                                 AlertRepository alertRepository,
                                 ServiceEnvironmentRepository serviceEnvironmentRepository,
                                 CostRecordRepository costRecordRepository,
                                 com.cloud_pricer.service.QuotaService quotaService,
                                 VmRepository vmRepository,
                                 K8sDeploymentRepository k8sDeploymentRepository,
                                 IdentitySigner identitySigner,
                                 @Value("${deployment-service-url:http://deployment-service:8082}") String deploymentServiceBaseUrl) {
        this.quotaRepository = quotaRepository;
        this.alertRepository = alertRepository;
        this.serviceEnvironmentRepository = serviceEnvironmentRepository;
        this.costRecordRepository = costRecordRepository;
        this.quotaService = quotaService;
        this.vmRepository = vmRepository;
        this.k8sDeploymentRepository = k8sDeploymentRepository;
        this.identitySigner = identitySigner;
        this.deploymentRestClient = RestClient.builder()
                .baseUrl(deploymentServiceBaseUrl)
                .build();
    }

    private static final double WARN_CPU = 80.0;
    private static final double CRIT_CPU = 90.0;
    private static final double WARN_RAM = 80.0;
    private static final double CRIT_RAM = 90.0;
    private static final double WARN_DISK = 85.0;
    private static final double CRIT_DISK = 95.0;
    private static final double WARN_PODS = 80.0;
    private static final double CRIT_PODS = 90.0;
    private static final double WARN_BUDGET = 80.0;
    private static final double CRIT_BUDGET = 100.0;

    /** Identité système interne utilisée pour l'auto-stop (gestion VM/K8s). */
    private static final String SYSTEM_USER_ID = "00000000-0000-0000-0000-00000000a1b2";

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
                if (seForBudget == null) {
                    // No owning SE → cannot attribute a tenant; skip budget check
                    // rather than fabricating a random tenant.
                    continue;
                }
                checkBudget(quota.getServiceEnvironmentId(), seForBudget.getTenantId(), quota.getMaxBudget(), quota.getPeriod());
            } catch (Exception e) {
                log.warn("Failed to check quota {} for service-env {}: {}",
                        quota.getId(), quota.getServiceEnvironmentId(), e.getMessage());
            }
        }

        log.info("Quota check complete");
    }

    private void checkSingleQuota(Quota quota) {
        UUID seId = quota.getServiceEnvironmentId();

        QuotaUsageResponse usage;
        try {
            usage = quotaService.usageFor(seId);
        } catch (Exception e) {
            log.debug("No usage available for service-env {}", seId);
            return;
        }

        if (usage == null) {
            return;
        }

        ServiceEnvironment se = serviceEnvironmentRepository.findById(seId).orElse(null);
        if (se == null) {
            // Unknown SE → cannot attribute a tenant; skip rather than creating
            // alerts under a random tenant UUID.
            log.debug("Service-env {} not found, skipping quota check", seId);
            return;
        }
        UUID tenantId = se.getTenantId();

        // Utilise l'usage d'allocation réel (somme des VMs/K8s) et non le
        // pourcentage de métrique, pour des alertes de quota cohérentes.
        checkMetric(seId, tenantId, "CPU", usage.cpu(), quota.getMaxCpu(), WARN_CPU, CRIT_CPU, "cores", "CPU");
        checkMetric(seId, tenantId, "RAM", usage.ram(), quota.getMaxRam(), WARN_RAM, CRIT_RAM, " Mo", "RAM");
        checkMetric(seId, tenantId, "DISK", usage.storage(), quota.getMaxStorage(), WARN_DISK, CRIT_DISK, " Go", "DISK");
        checkPods(seId, tenantId, usage.pods(), quota.getMaxPods());

        // Résolution automatique : ferme les alertes d'un quota dont l'usage est
        // revenu sous le seuil d'alerte (usage réel d'allocation).
        resolveHealthyAlerts(seId, tenantId, usage, quota);

        // Auto-stop (optionnel, par quota) : si le quota est épuisé et l'option
        // activée, stoppe les VMs et scale-0 les K8s du service-env après délai
        // de grâce.
        autoStopIfExceeded(quota, usage);
    }

    private void autoStopIfExceeded(Quota quota, QuotaUsageResponse usage) {
        if (!quota.isAutoStopOnExceed()) {
            return;
        }
        boolean exceeded = exceedsAny(quota, usage);
        if (!exceeded) {
            return;
        }
        if (!openCriticalAfterGrace(quota.getServiceEnvironmentId())) {
            return;
        }

        UUID seId = quota.getServiceEnvironmentId();
        List<Vm> vms = vmRepository.findByServiceEnvironmentId(seId);
        List<K8sDeployment> deploys = k8sDeploymentRepository.findByServiceEnvironmentId(seId);

        // Identité système interne avec les permissions de gestion VM/K8s,
        // signée avec le secret partagé et vérifiée par deployment-service.
        String rolesJson = "[\"SUPER_ADMIN\"]";
        String permsJson = "[\"VM_MANAGE\",\"K8S_MANAGE\"]";

        for (Vm vm : vms) {
            if (vm.getStatus() != null && vm.getStatus().equalsIgnoreCase("RUNNING")) {
                try {
                    UUID tenantId = vm.getTenantId();
                    String sig = signedHeaders(tenantId, rolesJson, permsJson);
                    deploymentRestClient.post()
                            .uri("/api/v1/vms/{id}/stop", vm.getId())
                            .header(IdentitySigner.ID_HEADER_USER_ID, SYSTEM_USER_ID)
                            .header(IdentitySigner.ID_HEADER_TENANT_ID, tenantId.toString())
                            .header(IdentitySigner.ID_HEADER_ROLES, rolesJson)
                            .header(IdentitySigner.ID_HEADER_PERMISSIONS, permsJson)
                            .header(IdentitySigner.SIGNATURE_HEADER, sig)
                            .retrieve()
                            .toBodilessEntity();
                    log.warn("AUTO-STOP: VM {} (SE {}) stopped due to quota exceeded", vm.getId(), seId);
                } catch (Exception e) {
                    log.warn("AUTO-STOP: failed to stop VM {}: {}", vm.getId(), e.getMessage());
                }
            }
        }

        for (K8sDeployment d : deploys) {
            if (d.getReplicas() > 0) {
                try {
                    UUID tenantId = d.getTenantId();
                    String sig = signedHeaders(tenantId, rolesJson, permsJson);
                    String body = "{\"replicas\":0}";
                    deploymentRestClient.post()
                            .uri("/api/v1/k8s/deployments/{id}/scale", d.getId())
                            .header(IdentitySigner.ID_HEADER_USER_ID, SYSTEM_USER_ID)
                            .header(IdentitySigner.ID_HEADER_TENANT_ID, tenantId.toString())
                            .header(IdentitySigner.ID_HEADER_ROLES, rolesJson)
                            .header(IdentitySigner.ID_HEADER_PERMISSIONS, permsJson)
                            .header(IdentitySigner.SIGNATURE_HEADER, sig)
                            .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                            .body(body)
                            .retrieve()
                            .toBodilessEntity();
                    log.warn("AUTO-STOP: K8s deployment {} (SE {}) scaled to 0 due to quota exceeded", d.getId(), seId);
                } catch (Exception e) {
                    log.warn("AUTO-STOP: failed to scale K8s deployment {}: {}", d.getId(), e.getMessage());
                }
            }
        }
    }

    private boolean exceedsAny(Quota quota, QuotaUsageResponse usage) {
        return (quota.getMaxCpu() > 0 && usage.cpu() >= quota.getMaxCpu())
                || (quota.getMaxRam() > 0 && usage.ram() >= quota.getMaxRam())
                || (quota.getMaxStorage() > 0 && usage.storage() >= quota.getMaxStorage())
                || (quota.getMaxPods() > 0 && usage.pods() >= quota.getMaxPods());
    }

    /**
     * L'auto-stop ne s'active qu'après une période de grâce : une alerte
     * CRITICAL (ouverte) pour ce SE doit exister depuis au moins grace-ms.
     */
    private boolean openCriticalAfterGrace(UUID seId) {
        Instant cutoff = Instant.now().minusMillis(autoStopGraceMs);
        return alertRepository.findByServiceEnvironmentId(seId).stream()
                .anyMatch(a -> "CRITICAL".equals(a.getSeverity())
                        && ("OPEN".equals(a.getStatus()) || "ACK".equals(a.getStatus()))
                        && (a.getCreatedAt() == null || a.getCreatedAt().isBefore(cutoff)));
    }

    private String signedHeaders(UUID tenantId, String rolesJson, String permissionsJson) {
        // Signature identité interne cohérente avec celle vérifiée par
        // deployment-service : userId + tenantId + roles + permissions.
        return identitySigner.sign(SYSTEM_USER_ID, tenantId.toString(), rolesJson, permissionsJson);
    }

    private void checkMetric(UUID seId, UUID tenantId, String metricName,
                             double actual, double threshold,
                             double warnAt, double critAt, String unit, String label) {
        if (threshold <= 0) return;

        double ratio = (actual / threshold) * 100.0;

        if (ratio >= critAt && !hasOpenAlert(seId, metricName, "CRITICAL")) {
            createAlert(seId, tenantId, metricName, threshold, actual, "CRITICAL",
                    label + " atteint " + String.format("%.1f", actual) + unit
                            + " / " + String.format("%.1f", threshold) + unit
                            + " (" + String.format("%.0f", ratio) + "%) — quota dépassé.");
            // Escalation: close any lower-severity WARNING alert for this metric so
            // both severities don't stay OPEN simultaneously.
            resolveAlerts(seId, metricName, "WARNING");
        } else if (ratio >= warnAt && !hasOpenAlert(seId, metricName, "WARNING")) {
            createAlert(seId, tenantId, metricName, threshold, actual, "WARNING",
                    label + " à " + String.format("%.0f", ratio) + "% du quota ("
                            + String.format("%.1f", actual) + unit + " / "
                            + String.format("%.1f", threshold) + unit + ").");
        }
    }

    private void checkPods(UUID seId, UUID tenantId, int actualPods, int maxPods) {
        if (maxPods <= 0) return;

        double ratio = ((double) actualPods / maxPods) * 100.0;

        if (ratio >= CRIT_PODS && !hasOpenAlert(seId, "PODS", "CRITICAL")) {
            createAlert(seId, tenantId, "PODS", maxPods, actualPods, "CRITICAL",
                    "Pods à " + actualPods + " — dépasse la limite de " + maxPods + " (quota dépassé).");
        } else if (ratio >= WARN_PODS && !hasOpenAlert(seId, "PODS", "WARNING")) {
            createAlert(seId, tenantId, "PODS", maxPods, actualPods, "WARNING",
                    "Pods à " + String.format("%.0f", ratio) + "% de la limite ("
                            + actualPods + " / " + maxPods + ").");
        }
    }

    /**
     * Résolution automatique des alertes d'un quota : toute alerte OPEN/ACK
     * d'une ressource (CPU/RAM/DISK/PODS) dont l'usage réel est repassé sous le
     * seuil d'alerte est marquée RESOLVED, avec la résolution datée.
     */
    private void resolveHealthyAlerts(UUID seId, UUID tenantId, QuotaUsageResponse usage, Quota quota) {
        resolveIfHealthy(seId, tenantId, "CPU", usage.cpu(), quota.getMaxCpu(), WARN_CPU);
        resolveIfHealthy(seId, tenantId, "RAM", usage.ram(), quota.getMaxRam(), WARN_RAM);
        resolveIfHealthy(seId, tenantId, "DISK", usage.storage(), quota.getMaxStorage(), WARN_DISK);
        if (quota.getMaxPods() > 0) {
            resolveIfHealthy(seId, tenantId, "PODS", usage.pods(), quota.getMaxPods(), WARN_PODS);
        }
        // Résolution automatique du budget : quand le coût de la période courante
        // repasse sous le seuil WARN du budget, les alertes BUDGET sont résolues.
        if (quota.getMaxBudget() > 0) {
            double usedCost = sumCostsInPeriod(seId, quota.getPeriod());
            double ratio = (usedCost / quota.getMaxBudget()) * 100.0;
            if (ratio < WARN_BUDGET) {
                resolveIfHealthy(seId, tenantId, "BUDGET", usedCost, quota.getMaxBudget(), WARN_BUDGET);
            }
        }
    }

    private void resolveIfHealthy(UUID seId, UUID tenantId, String metricName,
                                  double actual, double threshold, double warnAt) {
        if (threshold <= 0) return;
        double ratio = (actual / threshold) * 100.0;
        if (ratio < warnAt) {
            // Auto-resolve both OPEN and ACK alerts for this metric.
            List<Alert> candidates = new java.util.ArrayList<>();
            candidates.addAll(alertRepository.findByTenantIdAndStatus(tenantId, "OPEN"));
            candidates.addAll(alertRepository.findByTenantIdAndStatus(tenantId, "ACK"));
            for (Alert alert : candidates) {
                if (seId.equals(alert.getServiceEnvironmentId())
                        && metricName.equals(alert.getMetric())
                        && ("OPEN".equals(alert.getStatus()) || "ACK".equals(alert.getStatus()))) {
                    alert.setStatus("RESOLVED");
                    alert.setResolvedAt(Instant.now());
                    alertRepository.save(alert);
                    log.info("Alert {} auto-resolved ({}) as usage returned under threshold", alert.getId(), metricName);
                }
            }
        }
    }

    /**
     * Ferme (RESOLVED) toutes les alertes OPEN/ACK d'un SE pour un métrique et une
     * sévérité donnés. Utilisé lors de l'escalade WARNING→CRITICAL pour ne pas
     * laisser deux alertes ouvertes en parallèle.
     */
    private void resolveAlerts(UUID seId, String metricName, String severity) {
        for (Alert alert : alertRepository.findByServiceEnvironmentId(seId)) {
            if (metricName.equals(alert.getMetric())
                    && severity.equals(alert.getSeverity())
                    && ("OPEN".equals(alert.getStatus()) || "ACK".equals(alert.getStatus()))) {
                alert.setStatus("RESOLVED");
                alert.setResolvedAt(Instant.now());
                alertRepository.save(alert);
                log.info("Alert {} ({} {}) auto-resolved due to escalation", alert.getId(), severity, metricName);
            }
        }
    }

    private void checkBudget(UUID seId, UUID tenantId, double maxBudget, String period) {
        if (maxBudget <= 0) return;

        double usedCost = sumCostsInPeriod(seId, period);

        double ratio = (usedCost / maxBudget) * 100.0;

        if (ratio >= CRIT_BUDGET && !hasOpenAlert(seId, "BUDGET", "CRITICAL")) {
            createAlert(seId, tenantId, "BUDGET", maxBudget, usedCost, "CRITICAL",
                    "Budget épuisé — " + String.format("%.2f", usedCost) + " / " + String.format("%.2f", maxBudget)
                            + " (" + String.format("%.0f", ratio) + "%). Dépenses au-delà du budget alloué.");
        } else if (ratio >= WARN_BUDGET && !hasOpenAlert(seId, "BUDGET", "WARNING")) {
            createAlert(seId, tenantId, "BUDGET", maxBudget, usedCost, "WARNING",
                    "Budget presque épuisé — " + String.format("%.0f", ratio) + "% utilisé (" + String.format("%.2f", usedCost) + " / " + String.format("%.2f", maxBudget) + ")");
        }
    }

    /**
     * Somme les coûts du SE uniquement sur la période courante du quota
     * (MONTHLY → depuis le début du mois, WEEKLY → depuis le début de semaine,
     * DAILY → aujourd'hui, sinon tout l'historique).
     */
    private double sumCostsInPeriod(UUID seId, String period) {
        // Data is stored as UTC Instants, so compute period bounds in UTC to avoid
        // off-by-one-window drift when the JVM runs in a non-UTC system timezone.
        java.time.ZoneId zone = java.time.ZoneOffset.UTC;
        java.time.LocalDate today = java.time.LocalDate.now(zone);
        java.time.Instant from;
        if ("MONTHLY".equalsIgnoreCase(period) || "MONTH".equalsIgnoreCase(period)) {
            from = today.withDayOfMonth(1).atStartOfDay(zone).toInstant();
        } else if ("WEEKLY".equalsIgnoreCase(period) || "WEEK".equalsIgnoreCase(period)) {
            java.time.LocalDate monday = today.minusDays((today.getDayOfWeek().getValue() + 6) % 7);
            from = monday.atStartOfDay(zone).toInstant();
        } else if ("DAILY".equalsIgnoreCase(period) || "DAY".equalsIgnoreCase(period)) {
            from = today.atStartOfDay(zone).toInstant();
        } else {
            from = null; // période inconnue → tout l'historique
        }
        return costRecordRepository.findByServiceEnvironmentId(seId).stream()
                .filter(r -> from == null || (r.getPeriodEnd() != null && !r.getPeriodEnd().isBefore(from)))
                .mapToDouble(CostRecord::getTotalCost)
                .sum();
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
