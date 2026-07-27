package com.deployment.ServiceEntity.config;

import java.util.UUID;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.deployment.ServiceEntity.domain.Deployment;
import com.deployment.ServiceEntity.domain.Environment;
import com.deployment.ServiceEntity.domain.Service;
import com.deployment.ServiceEntity.domain.ServiceEnvironment;
import com.deployment.ServiceEntity.domain.VmClient;
import com.deployment.ServiceEntity.repository.DeploymentRepository;
import com.deployment.ServiceEntity.repository.EnvironmentRepository;
import com.deployment.ServiceEntity.repository.MetricRepository;
import com.deployment.ServiceEntity.repository.ServiceEnvironmentRepository;
import com.deployment.ServiceEntity.repository.ServiceRepository;
import com.deployment.ServiceEntity.repository.VmRepository;
import com.deployment.ServiceEntity.service.VmProvisioningService;

@Configuration
public class SeedDataConfig {

    public static final UUID TENANT_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");
    public static final UUID DEPLOYED_BY_ID = UUID.fromString("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");

    public static final UUID ENV_PROD_ID = UUID.fromString("22222222-2222-2222-2222-222222222222");
    public static final UUID ENV_STAGING_ID = UUID.fromString("33333333-3333-3333-3333-333333333333");

    public static final UUID SERVICE_USER_ID = UUID.fromString("44444444-4444-4444-4444-444444444444");
    public static final UUID SERVICE_AUTH_ID = UUID.fromString("55555555-5555-5555-5555-555555555555");

    public static final UUID SERVICE_ENV_USER_PROD_ID = UUID.fromString("66666666-6666-6666-6666-666666666666");
    public static final UUID SERVICE_ENV_AUTH_STAGING_ID = UUID.fromString("77777777-7777-7777-7777-777777777777");

    public static final UUID DEPLOYMENT_USER_ID = UUID.fromString("88888888-8888-8888-8888-888888888888");

    public static final UUID METRIC_USER_ID = UUID.fromString("99999999-9999-9999-9999-999999999999");
    public static final UUID METRIC_USER_1_ID = UUID.fromString("99999999-9999-9999-9999-999999999991");
    public static final UUID METRIC_USER_2_ID = UUID.fromString("99999999-9999-9999-9999-999999999992");
    public static final UUID METRIC_USER_3_ID = UUID.fromString("99999999-9999-9999-9999-999999999993");
    public static final UUID METRIC_USER_4_ID = UUID.fromString("99999999-9999-9999-9999-999999999994");

    // ── Seed VM ───────────────────────────────────────────────────────────────
    public static final UUID VM_SEED_ID = UUID.fromString("cccccccc-cccc-cccc-cccc-cccccccccccc");
    public static final String VM_SEED_NAME = "seed-vm-1";

    @Bean
    CommandLineRunner seedData(
            EnvironmentRepository environmentRepository,
            ServiceRepository serviceRepository,
            ServiceEnvironmentRepository serviceEnvironmentRepository,
            DeploymentRepository deploymentRepository,
            MetricRepository metricRepository,
            VmRepository vmRepository,
            VmClient vagrantClient,
            VmProvisioningService vmProvisioningService) {
        return args -> {
            if (!environmentRepository.existsById(ENV_PROD_ID)) {
                Environment env = new Environment();
                env.setId(ENV_PROD_ID);
                env.setName("production");
                env.setDescription("Production environment");
                env.setTenantId(TENANT_ID);
                environmentRepository.save(env);
            }

            if (!environmentRepository.existsById(ENV_STAGING_ID)) {
                Environment env = new Environment();
                env.setId(ENV_STAGING_ID);
                env.setName("staging");
                env.setDescription("Staging environment");
                env.setTenantId(TENANT_ID);
                environmentRepository.save(env);
            }

            if (!serviceRepository.existsById(SERVICE_USER_ID)) {
                Service service = new Service();
                service.setId(SERVICE_USER_ID);
                service.setName("user-service");
                service.setType("backend");
                service.setStatus(Service.Status.ACTIVE);
                service.setTenantId(TENANT_ID);
                serviceRepository.save(service);
            }

            if (!serviceRepository.existsById(SERVICE_AUTH_ID)) {
                Service service = new Service();
                service.setId(SERVICE_AUTH_ID);
                service.setName("auth-service");
                service.setType("backend");
                service.setStatus(Service.Status.ACTIVE);
                service.setTenantId(TENANT_ID);
                serviceRepository.save(service);
            }

            if (!serviceEnvironmentRepository.existsById(SERVICE_ENV_USER_PROD_ID)) {
                ServiceEnvironment relation = new ServiceEnvironment();
                relation.setId(SERVICE_ENV_USER_PROD_ID);
                relation.setServiceId(SERVICE_USER_ID);
                relation.setEnvironmentId(ENV_PROD_ID);
                relation.setTenantId(TENANT_ID);
                serviceEnvironmentRepository.save(relation);
            }

            if (!serviceEnvironmentRepository.existsById(SERVICE_ENV_AUTH_STAGING_ID)) {
                ServiceEnvironment relation = new ServiceEnvironment();
                relation.setId(SERVICE_ENV_AUTH_STAGING_ID);
                relation.setServiceId(SERVICE_AUTH_ID);
                relation.setEnvironmentId(ENV_STAGING_ID);
                relation.setTenantId(TENANT_ID);
                serviceEnvironmentRepository.save(relation);
            }

            if (!deploymentRepository.existsById(DEPLOYMENT_USER_ID)) {
                Deployment deployment = new Deployment();
                deployment.setId(DEPLOYMENT_USER_ID);
                deployment.setVersion("1.0.0");
                deployment.setStatus(Deployment.Status.SUCCESS);
                deployment.setNotes("Seed deployment for manual API tests");
                deployment.setDeployedBy(DEPLOYED_BY_ID);
                deployment.setServiceEnvironmentId(SERVICE_ENV_USER_PROD_ID);
                deployment.setTenantId(TENANT_ID);
                deploymentRepository.save(deployment);
            }

            // if (!metricRepository.existsById(METRIC_USER_ID)) {
            // Metric metric = new Metric();
            // metric.setId(METRIC_USER_ID);
            // metric.setCpuUsage(32.4f);
            // metric.setRamUsage(58.9f);
            // metric.setNetworkUsage(12.3f);
            // metric.setDiskUsage(41.7f);
            // metric.setPods(3);
            // metric.setServiceEnvironmentId(SERVICE_ENV_USER_PROD_ID);
            // metric.setCreatedAt(Instant.now().minusSeconds(500));

            // metricRepository.save(metric);
            // }
            // if (!metricRepository.existsById(METRIC_USER_1_ID)) {
            // Metric metric = new Metric();
            // metric.setId(METRIC_USER_1_ID);
            // metric.setCpuUsage(32.4f);
            // metric.setRamUsage(58.9f);
            // metric.setNetworkUsage(12.3f);
            // metric.setDiskUsage(41.7f);
            // metric.setPods(3);
            // metric.setServiceEnvironmentId(SERVICE_ENV_USER_PROD_ID);
            // metric.setCreatedAt(Instant.now().minusSeconds(400));

            // metricRepository.save(metric);
            // }

            // if (!metricRepository.existsById(METRIC_USER_2_ID)) {
            // Metric metric = new Metric();
            // metric.setId(METRIC_USER_2_ID);
            // metric.setCpuUsage(41.8f);
            // metric.setRamUsage(62.1f);
            // metric.setNetworkUsage(18.6f);
            // metric.setDiskUsage(44.2f);
            // metric.setPods(4);
            // metric.setServiceEnvironmentId(SERVICE_ENV_USER_PROD_ID);
            // metric.setCreatedAt(Instant.now().minusSeconds(300));
            // metricRepository.save(metric);
            // }

            // if (!metricRepository.existsById(METRIC_USER_3_ID)) {
            // Metric metric = new Metric();
            // metric.setId(METRIC_USER_3_ID);
            // metric.setCpuUsage(57.3f);
            // metric.setRamUsage(71.4f);
            // metric.setNetworkUsage(22.8f);
            // metric.setDiskUsage(49.5f);
            // metric.setPods(5);
            // metric.setServiceEnvironmentId(SERVICE_ENV_USER_PROD_ID);
            // metric.setCreatedAt(Instant.now().minusSeconds(200));
            // metricRepository.save(metric);
            // }

            // if (!metricRepository.existsById(METRIC_USER_4_ID)) {
            // Metric metric = new Metric();
            // metric.setId(METRIC_USER_4_ID);
            // metric.setCpuUsage(68.9f);
            // metric.setRamUsage(76.2f);
            // metric.setNetworkUsage(27.4f);
            // metric.setDiskUsage(53.1f);
            // metric.setPods(6);
            // metric.setServiceEnvironmentId(SERVICE_ENV_USER_PROD_ID);
            // metric.setCreatedAt(Instant.now().minusSeconds(100));
            // metricRepository.save(metric);
            // }

            // // ── Seed VM ───────────────────────────────────────────────────────

        };
    }
}