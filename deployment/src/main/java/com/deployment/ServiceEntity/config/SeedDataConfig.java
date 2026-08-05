package com.deployment.ServiceEntity.config;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.deployment.ServiceEntity.domain.Environment;
import com.deployment.ServiceEntity.domain.Metric;
import com.deployment.ServiceEntity.domain.Service;
import com.deployment.ServiceEntity.domain.ServiceEnvironment;
import com.deployment.ServiceEntity.domain.Vm;
import com.deployment.ServiceEntity.repository.EnvironmentRepository;
import com.deployment.ServiceEntity.repository.MetricRepository;
import com.deployment.ServiceEntity.repository.ServiceEnvironmentRepository;
import com.deployment.ServiceEntity.repository.ServiceRepository;
import com.deployment.ServiceEntity.repository.VmRepository;

/**
 * Génère un jeu de données de démonstration réaliste (noms métiers) si et
 * seulement si la base est vide. Les données sont reliées au tenant existant
 * (auto-détection : premier tenant transporté par les données ou constante de
 * repli) afin de peupler un déploiement frais sans écraser la production.
 */
@Configuration
public class SeedDataConfig {

    private static final Logger log = LoggerFactory.getLogger(SeedDataConfig.class);

    // Tenant cible (overridable via seed.tenant-id). Auto-détecté si déjà présent.
    public static final UUID DEFAULT_TENANT_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");

    // Identifiants stables, partagés avec cloud-pricer (PricingDataInitializer).
    public static final UUID ENV_PROD_ID = UUID.fromString("22222222-2222-2222-2222-222222222222");
    public static final UUID ENV_STAGING_ID = UUID.fromString("33333333-3333-3333-3333-333333333333");

    public static final UUID SERVICE_API_ID = UUID.fromString("44444444-4444-4444-4444-444444444444");
    public static final UUID SERVICE_BILLING_ID = UUID.fromString("55555555-5555-5555-5555-555555555555");
    public static final UUID SERVICE_NOTIFICATION_ID = UUID.fromString("55555555-5555-4555-8555-555555555556");
    public static final UUID SERVICE_AUTH_ID = UUID.fromString("55555555-5555-4555-8555-555555555557");

    public static final UUID SE_API_PROD_ID = UUID.fromString("66666666-6666-6666-6666-666666666666");
    public static final UUID SE_BILLING_PROD_ID = UUID.fromString("66666666-6666-4666-8666-666666666661");
    public static final UUID SE_NOTIF_STAGING_ID = UUID.fromString("66666666-6666-4666-8666-666666666662");
    public static final UUID SE_AUTH_PROD_ID = UUID.fromString("66666666-6666-4666-8666-666666666663");
    public static final UUID SE_AUTH_STAGING_ID = UUID.fromString("77777777-7777-7777-7777-777777777777");

    public static final UUID VM_API_ID = UUID.fromString("cccccccc-cccc-cccc-cccc-ccccccccccc1");
    public static final UUID VM_BILLING_ID = UUID.fromString("cccccccc-cccc-cccc-cccc-ccccccccccc2");
    public static final UUID VM_NOTIF_ID = UUID.fromString("cccccccc-cccc-cccc-cccc-ccccccccccc3");

    @Bean
    CommandLineRunner seedData(
            EnvironmentRepository environmentRepository,
            ServiceRepository serviceRepository,
            ServiceEnvironmentRepository serviceEnvironmentRepository,
            MetricRepository metricRepository,
            VmRepository vmRepository,
            org.springframework.core.env.Environment springEnv) {
        return args -> {
            String tenantIdProp = springEnv.getProperty("seed.tenant-id");
            UUID tenantId = tenantIdProp != null && !tenantIdProp.isBlank()
                    ? UUID.fromString(tenantIdProp)
                    : detectTenantId(serviceRepository, environmentRepository);

            boolean hasServices = serviceRepository.count() > 0;
            boolean hasEnvs = environmentRepository.count() > 0;
            boolean hasVms = vmRepository.count() > 0;

            if (hasServices || hasEnvs || hasVms) {
                log.info("[seed] Données existantes détectées — génération démo ignorée (tenant init probable).");
                return;
            }

            log.info("[seed] Base vide détectée — génération d'un jeu de démonstration réaliste pour tenant {}",
                    tenantId);

            seedEnvironments(environmentRepository, tenantId);
            seedServices(serviceRepository, tenantId);
            seedServiceEnvironments(serviceEnvironmentRepository, tenantId);
            seedVms(vmRepository, tenantId);
            seedMetrics(metricRepository);

            log.info("[seed] Jeu de démonstration généré : 4 services, 2 environnements, 5 liaisons, 3 VMs, métriques.");
        };
    }

    private UUID detectTenantId(ServiceRepository serviceRepository, EnvironmentRepository environmentRepository) {
        return environmentRepository.findAll().stream()
                .findFirst()
                .map(Environment::getTenantId)
                .orElseGet(() -> serviceRepository.findAll().stream()
                        .findFirst()
                        .map(Service::getTenantId)
                        .orElse(DEFAULT_TENANT_ID));
    }

    private void seedEnvironments(EnvironmentRepository repo, UUID tenantId) {
        repo.save(environment("production", "Environnement de production", tenantId, ENV_PROD_ID));
        repo.save(environment("staging", "Environnement de pré-production / staging", tenantId, ENV_STAGING_ID));
    }

    private Environment environment(String name, String description, UUID tenantId, UUID id) {
        Environment e = new Environment();
        e.setId(id);
        e.setName(name);
        e.setDescription(description);
        e.setTenantId(tenantId);
        return e;
    }

    private void seedServices(ServiceRepository repo, UUID tenantId) {
        repo.save(service("api-gateway", "backend", Service.Status.ACTIVE, Service.Runtime.DOCKER, tenantId, SERVICE_API_ID));
        repo.save(service("billing-service", "backend", Service.Status.ACTIVE, Service.Runtime.VAGRANT, tenantId, SERVICE_BILLING_ID));
        repo.save(service("notification-service", "backend", Service.Status.PENDING, Service.Runtime.K8S, tenantId, SERVICE_NOTIFICATION_ID));
        repo.save(service("auth-service", "backend", Service.Status.ACTIVE, Service.Runtime.VAGRANT, tenantId, SERVICE_AUTH_ID));
    }

    private Service service(String name, String type, Service.Status status, Service.Runtime runtime, UUID tenantId, UUID id) {
        Service s = new Service();
        s.setId(id);
        s.setName(name);
        s.setType(type);
        s.setStatus(status);
        s.setRuntime(runtime);
        s.setTenantId(tenantId);
        return s;
    }

    private void seedServiceEnvironments(ServiceEnvironmentRepository repo, UUID tenantId) {
        repo.save(se(SERVICE_API_ID, ENV_PROD_ID, tenantId, SE_API_PROD_ID));
        repo.save(se(SERVICE_BILLING_ID, ENV_PROD_ID, tenantId, SE_BILLING_PROD_ID));
        repo.save(se(SERVICE_NOTIFICATION_ID, ENV_STAGING_ID, tenantId, SE_NOTIF_STAGING_ID));
        repo.save(se(SERVICE_AUTH_ID, ENV_PROD_ID, tenantId, SE_AUTH_PROD_ID));
        repo.save(se(SERVICE_AUTH_ID, ENV_STAGING_ID, tenantId, SE_AUTH_STAGING_ID));
    }

    private ServiceEnvironment se(UUID serviceId, UUID environmentId, UUID tenantId, UUID id) {
        ServiceEnvironment se = new ServiceEnvironment();
        se.setId(id);
        se.setServiceId(serviceId);
        se.setEnvironmentId(environmentId);
        se.setTenantId(tenantId);
        return se;
    }

    private void seedVms(VmRepository repo, UUID tenantId) {
        repo.save(vm("api-gateway-prod", "Gateway de production", 4, 8192, 80, Vm.Os.UBUNTU_22_04, Vm.Status.RUNNING,
                "10.0.0.11", SE_API_PROD_ID, tenantId, VM_API_ID));
        repo.save(vm("billing-worker", "Worker de facturation", 8, 16384, 120, Vm.Os.UBUNTU_22_04, Vm.Status.RUNNING,
                "10.0.0.12", SE_BILLING_PROD_ID, tenantId, VM_BILLING_ID));
        repo.save(vm("notif-mailer", "Moteur de notifications", 2, 4096, 50, Vm.Os.CENTOS_7, Vm.Status.STOPPED,
                "10.0.0.13", SE_NOTIF_STAGING_ID, tenantId, VM_NOTIF_ID));
    }

    private Vm vm(String name, String displayName, int cpu, int ram, int disk, Vm.Os os, Vm.Status status,
            String ip, UUID seId, UUID tenantId, UUID id) {
        Vm v = new Vm();
        v.setId(id);
        v.setName(name);
        v.setDisplayName(displayName);
        v.setCpu(cpu);
        v.setRam(ram);
        v.setDisk(disk);
        v.setOs(os);
        v.setStatus(status);
        v.setIpAddress(ip);
        v.setServiceEnvironmentId(seId);
        v.setTenantId(tenantId);
        v.setCreatedAt(Instant.now());
        v.setUpdatedAt(Instant.now());
        return v;
    }

    /** Génère ~6 semaines de métriques bruitées et réalistes par environnement de service. */
    private void seedMetrics(MetricRepository repo) {
        List<UUID> seIds = List.of(SE_API_PROD_ID, SE_BILLING_PROD_ID, SE_NOTIF_STAGING_ID, SE_AUTH_PROD_ID, SE_AUTH_STAGING_ID);
        int rows = 0;
        long maxRows = 2000L;
        for (UUID seId : seIds) {
            double baseCpu = 35 + (seId.hashCode() % 20);
            double baseRam = 45 + (seId.hashCode() % 25);
            for (int i = 0; i < 300 && rows < maxRows; i++) {
                double wave = Math.sin(i / 6.0) * 12;
                Metric m = new Metric();
                m.setId(UUID.randomUUID());
                m.setServiceEnvironmentId(seId);
                m.setCpuUsage((float) clamp(baseCpu + wave + rnd(0, 8), 0, 98));
                m.setRamUsage((float) clamp(baseRam + wave * 0.7 + rnd(0, 6), 0, 99));
                m.setNetworkUsage((float) clamp(20 + wave * 0.5 + rnd(0, 10), 0, 100));
                m.setDiskUsage((float) clamp(50 + rnd(-4, 4), 0, 100));
                m.setPods(2 + (i % 4));
                m.setCreatedAt(Instant.now().minusSeconds((long) i * 3600));
                repo.save(m);
                rows++;
            }
        }
        log.info("[seed] {} métriques générées", rows);
    }

    private static double rnd(double min, double max) {
        return min + Math.random() * (max - min);
    }

    private static double clamp(double v, double min, double max) {
        return Math.max(min, Math.min(max, v));
    }
}