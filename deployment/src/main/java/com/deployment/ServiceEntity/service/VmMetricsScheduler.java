package com.deployment.ServiceEntity.service;

import java.time.Instant;
import java.util.List;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import com.deployment.ServiceEntity.domain.Metric;
import com.deployment.ServiceEntity.domain.VmClient;
import com.deployment.ServiceEntity.domain.Vm;
import com.deployment.ServiceEntity.repository.MetricRepository;
import com.deployment.ServiceEntity.repository.VmRepository;
import com.deployment.ServiceEntity.web.dto.vm.VmMetricsSnapshot;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
@RequiredArgsConstructor
public class VmMetricsScheduler {

    private final VmRepository vmRepository;
    private final MetricRepository metricRepository;
    private final VmClient vagrantClient;

    @Scheduled(fixedDelay = 5000) // toutes les 5 secondes après la fin du précédent
    public void collectMetrics() {
        List<Vm> runningVms = vmRepository.findByStatus(Vm.Status.RUNNING);

        if (runningVms.isEmpty()) {
            log.debug("No running VMs to collect metrics from");
            return;
        }

        log.info("Collecting metrics for {} running VM(s)", runningVms.size());

        for (Vm vm : runningVms) {
            if (vm.getVboxName() == null) {
                log.warn("Skipping metrics for VM {} (vboxName not set yet)", vm.getName());
                continue;
            }
            try {
                VmMetricsSnapshot snapshot = vagrantClient.queryMetrics(vm.getVboxName());
                if (snapshot == null) {
                    log.warn("Skipping metrics for VM {} (query failed)", vm.getName());
                    continue;
                }

                Metric metric = new Metric();
                metric.setVmId(vm.getId());
                metric.setCpuUsage(snapshot.getCpuUsage());
                double totalRamKB = vm.getRam() * 1024.0;
                metric.setRamUsage(totalRamKB > 0
                        ? (float) Math.min(100, Math.max(0, (snapshot.getRamUsageKb() / totalRamKB) * 100.0))
                        : 0f);
                double totalDiskMB = vm.getDisk() * 1024.0;
                metric.setDiskUsage(totalDiskMB > 0
                        ? (float) Math.min(100, Math.max(0, (snapshot.getDiskUsageMb() / totalDiskMB) * 100.0))
                        : 0f);
                metric.setNetworkUsage((float) snapshot.getNetworkRateBps());
                metric.setPods(0);
                metric.setServiceEnvironmentId(vm.getServiceEnvironmentId());
                metric.setTimestamp(Instant.now());

                metricRepository.save(metric);
                log.debug("Metric saved for VM {}", vm.getName());

            } catch (Exception e) {
                log.error("Failed to collect metrics for VM {}: {}", vm.getName(), e.getMessage());
            }
        }
    }
}