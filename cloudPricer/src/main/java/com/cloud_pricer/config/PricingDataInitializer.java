package com.cloud_pricer.config;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.cloud_pricer.domain.Alert;
import com.cloud_pricer.domain.CostBreakdown;
import com.cloud_pricer.domain.CostRecord;
import com.cloud_pricer.domain.PriceConfig;
import com.cloud_pricer.domain.Quota;
import com.cloud_pricer.repository.AlertRepository;
import com.cloud_pricer.repository.CostBreakdownRepository;
import com.cloud_pricer.repository.CostRecordRepository;
import com.cloud_pricer.repository.PriceConfigRepository;
import com.cloud_pricer.repository.QuotaRepository;

@Configuration
public class PricingDataInitializer {

    private static final Logger log = LoggerFactory.getLogger(PricingDataInitializer.class);

    private static final UUID SEED_TENANT_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID SERVICE_ENV_API_PROD = UUID.fromString("66666666-6666-6666-6666-666666666666");
    private static final UUID SERVICE_ENV_BILLING_PROD = UUID.fromString("66666666-6666-4666-8666-666666666661");
    private static final UUID SERVICE_ENV_NOTIF_STAGING = UUID.fromString("66666666-6666-4666-8666-666666666662");
    private static final UUID SERVICE_ENV_AUTH_PROD = UUID.fromString("66666666-6666-4666-8666-666666666663");
    private static final UUID SERVICE_ENV_AUTH_STAGING = UUID.fromString("77777777-7777-7777-7777-777777777777");

    @Bean
    CommandLineRunner seedPricingData(
            PriceConfigRepository priceConfigRepository,
            QuotaRepository quotaRepository,
            CostRecordRepository costRecordRepository,
            CostBreakdownRepository costBreakdownRepository,
            AlertRepository alertRepository) {
        return args -> {
            seedPriceConfigs(priceConfigRepository);
            seedQuotas(quotaRepository);
            seedCostRecords(costRecordRepository, costBreakdownRepository);
            seedAlerts(alertRepository);
        };
    }

    private void seedPriceConfigs(PriceConfigRepository repo) {
        if (repo.count() > 0) {
            log.info("PriceConfig already seeded ({} rows)", repo.count());
            return;
        }

        List<PriceConfig> configs = List.of(
            createPriceConfig("VM", "CPU",     0.0000316, "vCPU/h", "EUR"),
            createPriceConfig("VM", "RAM",     0.0000042, "GB/h",   "EUR"),
            createPriceConfig("VM", "DISK",    0.0001,    "GB",     "EUR"),
            createPriceConfig("VM", "NETWORK", 0.01,      "GB",     "EUR"),
            createPriceConfig("VM", "BACKUP",  0.02,      "GB",     "EUR"),
            createPriceConfig("VM", "OS",      0.03,      "fixed",  "EUR"),
            createPriceConfig("KUBERNETES", "CPU",     0.000025,  "vCPU/h", "EUR"),
            createPriceConfig("KUBERNETES", "RAM",     0.0000035, "GB/h",   "EUR"),
            createPriceConfig("KUBERNETES", "DISK",    0.00008,   "GB",     "EUR"),
            createPriceConfig("KUBERNETES", "NETWORK", 0.008,     "GB",     "EUR"),
            createPriceConfig("KUBERNETES", "BACKUP",  0.015,     "GB",     "EUR")
        );

        repo.saveAll(configs);
        log.info("Seeded {} price config entries", configs.size());
    }

    private void seedQuotas(QuotaRepository repo) {
        if (repo.count() > 0) {
            log.info("Quota already seeded ({} rows)", repo.count());
            return;
        }

        List<Quota> quotas = List.of(
            createQuota(SERVICE_ENV_API_PROD, SEED_TENANT_ID, 8, 32, 500, 10, 5000, "MONTHLY"),
            createQuota(SERVICE_ENV_BILLING_PROD, SEED_TENANT_ID, 16, 64, 1000, 20, 8000, "MONTHLY"),
            createQuota(SERVICE_ENV_AUTH_PROD, SEED_TENANT_ID, 4, 16, 250, 5, 2500, "MONTHLY"),
            createQuota(SERVICE_ENV_NOTIF_STAGING, SEED_TENANT_ID, 2, 8, 100, 3, 500, "MONTHLY"),
            createQuota(SERVICE_ENV_AUTH_STAGING, SEED_TENANT_ID, 4, 16, 250, 5, 2500, "MONTHLY")
        );

        repo.saveAll(quotas);
        log.info("Seeded {} quotas", quotas.size());
    }

    private void seedCostRecords(CostRecordRepository costRepo, CostBreakdownRepository breakdownRepo) {
        if (costRepo.count() > 0) {
            log.info("CostRecord already seeded ({} rows)", costRepo.count());
            return;
        }

        Instant now = Instant.now();
        Instant monthStart = now.truncatedTo(ChronoUnit.DAYS).minus(30, ChronoUnit.DAYS);
        Instant monthEnd = now;

        List<CostRecord> records = new ArrayList<>();

        // 6 mois d'historique réaliste par environnement de service (mode VM / K8s)
        Instant p = monthStart.minus(150, ChronoUnit.DAYS);
        for (int m = 0; m < 6; m++) {
            Instant start = p;
            Instant end = start.plus(30, ChronoUnit.DAYS);
            records.add(createCostRecord(SEED_TENANT_ID, SERVICE_ENV_API_PROD, start, end, "VM",
                    132.40 + m * 4.2, 55.90, 18.40, 6.20, 0.03));
            records.add(createCostRecord(SEED_TENANT_ID, SERVICE_ENV_BILLING_PROD, start, end, "VM",
                    220.10 + m * 6.8, 95.30, 21.60, 8.40, 0.03));
            records.add(createCostRecord(SEED_TENANT_ID, SERVICE_ENV_AUTH_PROD, start, end, "VM",
                    74.80 + m * 2.1, 28.60, 7.50, 2.90, 0.03));
            records.add(createCostRecord(SEED_TENANT_ID, SERVICE_ENV_NOTIF_STAGING, start, end, "KUBERNETES",
                    41.30 + m * 1.5, 12.80, 4.60, 1.90, 0.00));
            records.add(createCostRecord(SEED_TENANT_ID, SERVICE_ENV_AUTH_STAGING, start, end, "KUBERNETES",
                    62.10 + m * 1.8, 18.40, 5.90, 2.30, 0.00));
            p = end;
        }

        List<CostRecord> saved = costRepo.saveAll(records);
        log.info("Seeded {} cost records", saved.size());

        List<CostBreakdown> breakdowns = new ArrayList<>();
        for (CostRecord r : saved) {
            breakdowns.add(createBreakdown(r.getId(), "CPU", 0.0000316, 192));
            breakdowns.add(createBreakdown(r.getId(), "RAM", 0.0000042, 720));
            breakdowns.add(createBreakdown(r.getId(), "DISK", 0.0001, 500));
            breakdowns.add(createBreakdown(r.getId(), "NETWORK", 0.01, 1230));
            breakdowns.add(createBreakdown(r.getId(), "BACKUP", 0.02, 250));
        }
        breakdownRepo.saveAll(breakdowns);
        log.info("Seeded {} cost breakdowns", breakdowns.size());
    }

    private PriceConfig createPriceConfig(String mode, String resourceType, double price, String unit, String currency) {
        PriceConfig pc = new PriceConfig();
        pc.setMode(mode);
        pc.setResourceType(resourceType);
        pc.setPricePerUnit(price);
        pc.setUnit(unit);
        pc.setCurrency(currency);
        pc.setActive(true);
        return pc;
    }

    private Quota createQuota(UUID seId, UUID tenantId, double cpu, double ram, double storage, int pods, double budget, String period) {
        Quota q = new Quota();
        q.setServiceEnvironmentId(seId);
        q.setTenantId(tenantId);
        q.setMaxCpu(cpu);
        q.setMaxRam(ram);
        q.setMaxStorage(storage);
        q.setMaxPods(pods);
        q.setMaxBudget(budget);
        q.setPeriod(period);
        q.setActive(true);
        return q;
    }

    private CostRecord createCostRecord(UUID tenantId, UUID seId, Instant start, Instant end, String mode,
            double compute, double storage, double network, double backup, double os) {
        CostRecord r = new CostRecord();
        r.setTenantId(tenantId);
        r.setServiceEnvironmentId(seId);
        r.setPeriodStart(start);
        r.setPeriodEnd(end);
        r.setMode(mode);
        r.setComputeCost(compute);
        r.setStorageCost(storage);
        r.setNetworkCost(network);
        r.setBackupCost(backup);
        r.setOsCost(os);
        return r;
    }

    private CostBreakdown createBreakdown(UUID costRecordId, String type, double unitCost, double quantity) {
        CostBreakdown b = new CostBreakdown();
        b.setCostRecordId(costRecordId);
        b.setType(type);
        b.setUnitCost(unitCost);
        b.setQuantity(quantity);
        return b;
    }

    private void seedAlerts(AlertRepository repo) {
        if (repo.count() > 0) {
            log.info("Alert already seeded ({} rows)", repo.count());
            return;
        }

        List<Alert> alerts = List.of(
            createAlert(SERVICE_ENV_API_PROD, "COST", "compute", 200.0, 187.40, "WARNING", "Utilisation calcul proche du quota (187.40/200)"),
            createAlert(SERVICE_ENV_BILLING_PROD, "COST", "compute", 300.0, 298.10, "CRITICAL", "Coût de calcul proche du seuil critique"),
            createAlert(SERVICE_ENV_AUTH_STAGING, "COST", "compute", 100.0, 72.60, "INFO", "Coût de calcul à 72.60"),
            createAlert(SERVICE_ENV_API_PROD, "PERFORMANCE", "cpu", 80.0, 68.9, "WARNING", "Utilisation CPU à 68.9% (seuil: 80%)"),
            createAlert(SERVICE_ENV_AUTH_STAGING, "PERFORMANCE", "memory", 90.0, 76.2, "INFO", "Utilisation mémoire à 76.2%"),
            createAlert(SERVICE_ENV_API_PROD, "BUDGET", "budget", 5000.0, 3835.90, "WARNING", "Budget consommé à 76.7% (3835.90/5000)")
        );

        repo.saveAll(alerts);
        log.info("Seeded {} alerts", alerts.size());
    }

    private Alert createAlert(UUID seId, String type, String metric, double threshold, double actualValue, String severity, String message) {
        Alert a = new Alert();
        a.setTenantId(SEED_TENANT_ID);
        a.setServiceEnvironmentId(seId);
        a.setType(type);
        a.setMetric(metric);
        a.setThreshold(threshold);
        a.setActualValue(actualValue);
        a.setSeverity(severity);
        a.setStatus("OPEN");
        a.setMessage(message);
        return a;
    }
}
