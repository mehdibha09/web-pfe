package com.cloud_pricer.service;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import com.cloud_pricer.domain.CostBreakdown;
import com.cloud_pricer.domain.CostRecord;
import com.cloud_pricer.domain.PriceConfig;
import com.cloud_pricer.domain.ServiceEnvironment;
import com.cloud_pricer.repository.ServiceEnvironmentRepository;
import com.cloud_pricer.web.dto.cost.MetricSnapshot;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@ConditionalOnProperty(name = "cost.auto-gen.enabled", havingValue = "true", matchIfMissing = true)
@RequiredArgsConstructor
public class CostAutoGeneratorService {

    private final CostRecordService costRecordService;
    private final PriceConfigService priceConfigService;
    private final ServiceEnvironmentRepository serviceEnvironmentRepository;

    private final RestClient restClient = RestClient.builder()
            .baseUrl("http://localhost:8082")
            .build();

    @Scheduled(fixedDelayString = "${cost.auto-gen.interval:3600000}", initialDelay = 120000)
    public void autoGenerateCosts() {
        log.info("Running cost auto-generation");
        List<ServiceEnvironment> allSe = serviceEnvironmentRepository.findAll();
        if (allSe.isEmpty()) {
            log.debug("No service environments found, skipping cost auto-generation");
            return;
        }
        for (ServiceEnvironment se : allSe) {
            try {
                MetricSnapshot metric = fetchLatestMetric(se.getId());
                if (metric == null) continue;
                String mode = "VM";
                List<PriceConfig> configs = priceConfigService.getAllByModeForSystem(mode);
                if (configs.isEmpty()) {
                    configs = priceConfigService.getAllByModeForSystem("KUBERNETES");
                    mode = "KUBERNETES";
                }
                if (configs.isEmpty()) {
                    log.debug("No active price configs for se={}", se.getId());
                    continue;
                }
                generateCostRecord(mode, se, metric, configs);
            } catch (Exception e) {
                log.debug("Cannot auto-generate cost for se {}: {}", se.getId(), e.getMessage());
            }
        }
    }

    private MetricSnapshot fetchLatestMetric(UUID seId) {
        try {
            return restClient.get()
                    .uri("/api/v1/metrics/latest/{seId}", seId)
                    .retrieve()
                    .body(MetricSnapshot.class);
        } catch (Exception e) {
            return null;
        }
    }

    private void generateCostRecord(String mode, ServiceEnvironment se, MetricSnapshot metric, List<PriceConfig> configs) {
        double hours = 720;
        double computeCost = 0, storageCost = 0, networkCost = 0, backupCost = 0, osCost = 0;

        for (PriceConfig cfg : configs) {
            if (!cfg.isActive()) continue;
            switch (cfg.getResourceType()) {
                case "CPU":
                    computeCost += metric.cpuUsage() * cfg.getPricePerUnit() * hours / 100.0;
                    break;
                case "RAM":
                    computeCost += metric.ramUsage() * cfg.getPricePerUnit() * hours / 100.0;
                    break;
                case "DISK":
                    storageCost += metric.diskUsage() * cfg.getPricePerUnit() / 100.0;
                    break;
                case "NETWORK":
                    networkCost += metric.networkUsage() * cfg.getPricePerUnit();
                    break;
                case "BACKUP":
                    backupCost += cfg.getPricePerUnit();
                    break;
                case "OS":
                    osCost += cfg.getPricePerUnit();
                    break;
            }
        }

        Instant now = Instant.now();
        CostRecord record = new CostRecord();
        record.setTenantId(se.getTenantId());
        record.setServiceEnvironmentId(se.getId());
        record.setPeriodStart(now.minusSeconds((long) (hours * 3600)));
        record.setPeriodEnd(now);
        record.setMode(mode);
        record.setComputeCost(computeCost);
        record.setStorageCost(storageCost);
        record.setNetworkCost(networkCost);
        record.setBackupCost(backupCost);
        record.setOsCost(osCost);

        CostBreakdown cpuBd = new CostBreakdown();
        cpuBd.setType("CPU");
        cpuBd.setUnitCost(pricePerUnit(configs, "CPU"));
        cpuBd.setQuantity((double) metric.cpuUsage());
        cpuBd.setTotal(computeCost);

        CostBreakdown ramBd = new CostBreakdown();
        ramBd.setType("RAM");
        ramBd.setUnitCost(pricePerUnit(configs, "RAM"));
        ramBd.setQuantity((double) metric.ramUsage());
        ramBd.setTotal(computeCost);

        CostBreakdown diskBd = new CostBreakdown();
        diskBd.setType("DISK");
        diskBd.setUnitCost(pricePerUnit(configs, "DISK"));
        diskBd.setQuantity((double) metric.diskUsage());
        diskBd.setTotal(storageCost);

        CostBreakdown netBd = new CostBreakdown();
        netBd.setType("NETWORK");
        netBd.setUnitCost(pricePerUnit(configs, "NETWORK"));
        netBd.setQuantity((double) metric.networkUsage());
        netBd.setTotal(networkCost);

        costRecordService.create(record, List.of(cpuBd, ramBd, diskBd, netBd));
        log.info("Auto-generated cost record for se={} total={}", se.getId(), record.getTotalCost());
    }

    private double pricePerUnit(List<PriceConfig> configs, String resourceType) {
        return configs.stream()
                .filter(c -> c.getResourceType().equals(resourceType) && c.isActive())
                .mapToDouble(PriceConfig::getPricePerUnit)
                .findFirst()
                .orElse(0);
    }
}
