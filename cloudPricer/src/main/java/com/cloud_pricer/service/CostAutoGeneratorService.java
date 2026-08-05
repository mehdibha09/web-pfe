package com.cloud_pricer.service;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import com.cloud_pricer.domain.CostBreakdown;
import com.cloud_pricer.domain.CostRecord;
import com.cloud_pricer.domain.K8sDeployment;
import com.cloud_pricer.domain.PriceConfig;
import com.cloud_pricer.domain.ServiceEnvironment;
import com.cloud_pricer.domain.Vm;
import com.cloud_pricer.repository.K8sDeploymentRepository;
import com.cloud_pricer.repository.ServiceEnvironmentRepository;
import com.cloud_pricer.repository.VmRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Auto-generates cost records using Model A: allocation × RUNNING duration.
 * Reads VM / K8s deployment allocations directly from the shared database
 * (same PostgreSQL instance as deployment-service), so no internal REST calls.
 *
 * <p>Billing window is <b>incremental</b>: each run computes only the elapsed
 * time since the previous cost record's {@code periodEnd} (or since the first
 * allocation started), so successive runs append non-overlapping windows instead
 * of re-inserting a full-month record every hour.
 */
@Slf4j
@Service
@ConditionalOnProperty(name = "cost.auto-gen.enabled", havingValue = "true", matchIfMissing = true)
@RequiredArgsConstructor
public class CostAutoGeneratorService {

    private static final double HOURS_PER_MONTH = 720.0;

    private final CostRecordService costRecordService;
    private final PriceConfigService priceConfigService;
    private final ServiceEnvironmentRepository serviceEnvironmentRepository;
    private final VmRepository vmRepository;
    private final K8sDeploymentRepository k8sDeploymentRepository;

    @Scheduled(fixedDelayString = "${cost.auto-gen.interval:3600000}", initialDelay = 120000)
    public void autoGenerateCosts() {
        log.info("Running cost auto-generation (Model A: allocation x RUNNING duration)");
        List<ServiceEnvironment> allSe = serviceEnvironmentRepository.findAll();
        if (allSe.isEmpty()) {
            log.debug("No service environments found, skipping cost auto-generation");
            return;
        }
        for (ServiceEnvironment se : allSe) {
            try {
                generateForServiceEnvironment(se);
            } catch (Exception e) {
                log.debug("Cannot auto-generate cost for se {}: {}", se.getId(), e.getMessage());
            }
        }
    }

    private void generateForServiceEnvironment(ServiceEnvironment se) {
        List<Vm> vms = vmRepository.findByServiceEnvironmentId(se.getId());
        List<K8sDeployment> deployments = k8sDeploymentRepository.findByServiceEnvironmentId(se.getId());

        if (vms.isEmpty() && deployments.isEmpty()) {
            return;
        }

        Window window = computeWindow(se, vms, deployments);
        if (window.hours() <= 0) {
            log.debug("No elapsed time to bill for se={} (window empty)", se.getId());
            return;
        }

        if (!vms.isEmpty()) {
            List<PriceConfig> configs = priceConfigService.getAllByModeForSystem("VM");
            if (configs.isEmpty()) {
                log.debug("No active price configs for mode VM, se={}", se.getId());
                return;
            }
            generateVmCost(se, vms, configs, window);
            return;
        }

        List<PriceConfig> k8sConfigs = priceConfigService.getAllByModeForSystem("KUBERNETES");
        if (k8sConfigs.isEmpty()) {
            log.debug("No active price configs for mode KUBERNETES, se={}", se.getId());
            return;
        }
        generateK8sCost(se, deployments, k8sConfigs, window);
    }

    private void generateVmCost(ServiceEnvironment se, List<Vm> vms, List<PriceConfig> configs, Window window) {
        double computeCost = 0, storageCost = 0, networkCost = 0, backupCost = 0, osCost = 0;
        double cpuQty = 0, ramQty = 0, diskQty = 0;

        for (Vm vm : vms) {
            if (!isRunning(vm.getStatus())) {
                continue;
            }
            double hours = hoursInWindow(vm.getCreatedAt(), window);
            if (hours <= 0) {
                continue;
            }
            double fraction = hours / HOURS_PER_MONTH;
            double cpu = vm.getCpu();
            double ram = vm.getRam() / 1024.0; // Mo → Go
            double disk = vm.getDisk();
            cpuQty += cpu;
            ramQty += ram;
            diskQty += disk;
            computeCost += cpu * pricePerUnit(configs, "CPU") * hours;
            computeCost += ram * pricePerUnit(configs, "RAM") * hours;
            storageCost += disk * pricePerUnit(configs, "DISK") * fraction;
            if (vm.isBackupEnabled()) {
                backupCost += pricePerUnit(configs, "BACKUP") * disk * fraction;
            }
            osCost += pricePerUnit(configs, "OS") * fraction;
        }

        if (cpuQty <= 0 && ramQty <= 0) {
            log.debug("No running VM allocation for se={}", se.getId());
            return;
        }

        CostRecord record = buildRecord(se, window, "VM",
            computeCost, storageCost, networkCost, backupCost, osCost);

        List<CostBreakdown> breakdowns = List.of(
            breakdown("CPU", pricePerUnit(configs, "CPU"), cpuQty, computeCost),
            breakdown("RAM", pricePerUnit(configs, "RAM"), ramQty, computeCost),
            breakdown("DISK", pricePerUnit(configs, "DISK"), diskQty, storageCost)
        );

        costRecordService.create(record, breakdowns);
        log.info("Auto-generated VM cost record for se={} total={}", se.getId(), record.getTotalCost());
    }

    private void generateK8sCost(ServiceEnvironment se, List<K8sDeployment> deployments, List<PriceConfig> configs, Window window) {
        double computeCost = 0, storageCost = 0, networkCost = 0, backupCost = 0, osCost = 0;
        double cpuQty = 0, ramQty = 0;

        for (K8sDeployment d : deployments) {
            if (!isRunning(d.getStatus())) {
                continue;
            }
            double hours = hoursInWindow(d.getCreatedAt(), window);
            if (hours <= 0) {
                continue;
            }
            double fraction = hours / HOURS_PER_MONTH;
            double cpu = parseCpuRequest(d.getCpuRequest()) * d.getReplicas();
            double ram = parseMemoryRequest(d.getMemoryRequest()) * d.getReplicas();
            cpuQty += cpu;
            ramQty += ram;
            computeCost += cpu * pricePerUnit(configs, "CPU") * hours;
            computeCost += ram * pricePerUnit(configs, "RAM") * hours;
            osCost += pricePerUnit(configs, "OS") * d.getReplicas() * fraction;
        }

        if (cpuQty <= 0 && ramQty <= 0) {
            log.debug("No running K8s allocation for se={}", se.getId());
            return;
        }

        CostRecord record = buildRecord(se, window, "KUBERNETES",
            computeCost, storageCost, networkCost, backupCost, osCost);

        List<CostBreakdown> breakdowns = List.of(
            breakdown("CPU", pricePerUnit(configs, "CPU"), cpuQty, computeCost),
            breakdown("RAM", pricePerUnit(configs, "RAM"), ramQty, computeCost)
        );

        costRecordService.create(record, breakdowns);
        log.info("Auto-generated K8s cost record for se={} total={}", se.getId(), record.getTotalCost());
    }

    private CostRecord buildRecord(ServiceEnvironment se, Window window, String mode,
            double compute, double storage, double network, double backup, double os) {
        CostRecord record = new CostRecord();
        record.setTenantId(se.getTenantId());
        record.setServiceEnvironmentId(se.getId());
        record.setPeriodStart(window.start());
        record.setPeriodEnd(window.end());
        record.setMode(mode);
        record.setComputeCost(compute);
        record.setStorageCost(storage);
        record.setNetworkCost(network);
        record.setBackupCost(backup);
        record.setOsCost(os);
        return record;
    }

    /**
     * Billing window = [last cost record periodEnd, now], capped at one month.
     * On the first run (no record yet) the window starts at the earliest
     * allocation (first RUNNING resource creation), still capped at one month.
     */
    private Window computeWindow(ServiceEnvironment se, List<Vm> vms, List<K8sDeployment> deployments) {
        Instant now = Instant.now();
        Instant latestEnd = null;
        CostRecord last = costRecordService.findLatestByServiceEnvironmentId(se.getId());
        if (last != null && last.getPeriodEnd() != null) {
            latestEnd = last.getPeriodEnd();
        }

        Instant start = latestEnd;
        if (start == null) {
            start = earliestAllocationStart(vms, deployments);
        }
        if (start == null) {
            start = now.minusSeconds((long) (HOURS_PER_MONTH * 3600));
        }

        Instant earliestAllowed = now.minusSeconds((long) (HOURS_PER_MONTH * 3600));
        if (start.isBefore(earliestAllowed)) {
            start = earliestAllowed;
        }
        if (!start.isBefore(now)) {
            return new Window(now, now, 0);
        }

        double hours = Math.min(HOURS_PER_MONTH, Duration.between(start, now).toHours());
        return new Window(start, now, hours);
    }

    private Instant earliestAllocationStart(List<Vm> vms, List<K8sDeployment> deployments) {
        Instant earliest = null;
        for (Vm vm : vms) {
            if (isRunning(vm.getStatus()) && vm.getCreatedAt() != null
                    && (earliest == null || vm.getCreatedAt().isBefore(earliest))) {
                earliest = vm.getCreatedAt();
            }
        }
        for (K8sDeployment d : deployments) {
            if (isRunning(d.getStatus()) && d.getCreatedAt() != null
                    && (earliest == null || d.getCreatedAt().isBefore(earliest))) {
                earliest = d.getCreatedAt();
            }
        }
        return earliest;
    }

    private double hoursInWindow(Instant createdAt, Window window) {
        Instant vmStart = createdAt != null ? createdAt : window.start();
        if (vmStart.isAfter(window.end())) {
            return 0;
        }
        Instant start = vmStart.isBefore(window.start()) ? window.start() : vmStart;
        return Math.min(HOURS_PER_MONTH, Duration.between(start, window.end()).toHours());
    }

    private boolean isRunning(String status) {
        return status != null && "RUNNING".equalsIgnoreCase(status);
    }

    private CostBreakdown breakdown(String type, double unitCost, double quantity, double total) {
        CostBreakdown bd = new CostBreakdown();
        bd.setType(type);
        bd.setUnitCost(unitCost);
        bd.setQuantity(quantity);
        bd.setTotal(total);
        return bd;
    }

    private double parseCpuRequest(String value) {
        if (value == null || value.isBlank()) {
            return 1;
        }
        String v = value.trim();
        try {
            if (v.endsWith("m")) {
                return Double.parseDouble(v.substring(0, v.length() - 1)) / 1000.0;
            }
            return Double.parseDouble(v);
        } catch (NumberFormatException e) {
            return 1;
        }
    }

    private double parseMemoryRequest(String value) {
        if (value == null || value.isBlank()) {
            return 0.5;
        }
        String v = value.trim().toUpperCase();
        try {
            if (v.endsWith("GI")) {
                return Double.parseDouble(v.substring(0, v.length() - 2));
            }
            if (v.endsWith("MI")) {
                return Double.parseDouble(v.substring(0, v.length() - 2)) / 1024.0;
            }
            if (v.endsWith("G")) {
                return Double.parseDouble(v.substring(0, v.length() - 1));
            }
            if (v.endsWith("M")) {
                return Double.parseDouble(v.substring(0, v.length() - 1)) / 1024.0;
            }
            return Double.parseDouble(v) / 1024.0;
        } catch (NumberFormatException e) {
            return 0.5;
        }
    }

    private double pricePerUnit(List<PriceConfig> configs, String resourceType) {
        return configs.stream()
                .filter(c -> resourceType.equals(c.getResourceType()) && c.isActive())
                .mapToDouble(PriceConfig::getPricePerUnit)
                .findFirst()
                .orElse(0);
    }

    private record Window(Instant start, Instant end, double hours) {}
}
