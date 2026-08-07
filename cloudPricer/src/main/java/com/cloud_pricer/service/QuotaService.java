package com.cloud_pricer.service;

import com.cloud_pricer.config.UserContext;
import com.cloud_pricer.domain.K8sDeployment;
import com.cloud_pricer.domain.Quota;
import com.cloud_pricer.domain.Vm;
import com.cloud_pricer.exception.ApiException;
import com.cloud_pricer.repository.K8sDeploymentRepository;
import com.cloud_pricer.repository.QuotaRepository;
import com.cloud_pricer.repository.VmRepository;
import com.cloud_pricer.web.dto.quota.QuotaUsageResponse;
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
public class QuotaService {

    private final QuotaRepository quotaRepository;
    private final VmRepository vmRepository;
    private final K8sDeploymentRepository k8sDeploymentRepository;

    public Quota create(Quota quota) {
        validateLimitsNotBelowUsage(quota);
        Quota saved = quotaRepository.save(quota);
        log.info("Created quota {} for SE {}", saved.getId(), saved.getServiceEnvironmentId());
        return saved;
    }

    public Quota getById(UUID id) {
        return quotaRepository.findById(id)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Quota not found"));
    }

    public List<Quota> getAll() {
        return quotaRepository.findByTenantId(UserContext.getTenantId());
    }

    public Page<Quota> getPageByTenantId(UUID tenantId, Pageable pageable) {
        return quotaRepository.findByTenantId(tenantId, pageable);
    }

    public List<Quota> getByServiceEnvironmentId(UUID serviceEnvironmentId) {
        return quotaRepository.findByServiceEnvironmentId(serviceEnvironmentId);
    }

    public Quota update(UUID id, Quota updated) {
        Quota existing = getById(id);
        existing.setMaxCpu(updated.getMaxCpu());
        existing.setMaxRam(updated.getMaxRam());
        existing.setMaxStorage(updated.getMaxStorage());
        existing.setMaxPods(updated.getMaxPods());
        existing.setMaxBudget(updated.getMaxBudget());
        existing.setPeriod(updated.getPeriod());
        existing.setActive(updated.isActive());
        validateLimitsNotBelowUsage(existing);
        Quota saved = quotaRepository.save(existing);
        log.info("Updated quota {}", id);
        return saved;
    }

    /**
     * A quota limit must never be lower than the resources already consumed by
     * the service environment (existing VMs / K8s deployments). Otherwise the
     * environment would be in an immediate "quota exceeded" state.
     */
    private void validateLimitsNotBelowUsage(Quota quota) {
        QuotaUsageResponse usage = usageFor(quota.getServiceEnvironmentId());
        List<String> violations = new java.util.ArrayList<>();
        if (quota.getMaxCpu() > 0 && quota.getMaxCpu() < usage.cpu()) {
            violations.add("CPU (quota " + quota.getMaxCpu() + " < usage " + usage.cpu() + ")");
        }
        if (quota.getMaxRam() > 0 && quota.getMaxRam() < usage.ram()) {
            violations.add("RAM (quota " + quota.getMaxRam() + " Mo < usage " + usage.ram() + " Mo)");
        }
        if (quota.getMaxStorage() > 0 && quota.getMaxStorage() < usage.storage()) {
            violations.add("stockage (quota " + quota.getMaxStorage() + " Go < usage " + usage.storage() + " Go)");
        }
        if (quota.getMaxPods() > 0 && quota.getMaxPods() < usage.pods()) {
            violations.add("pods (quota " + quota.getMaxPods() + " < usage " + usage.pods() + ")");
        }
        if (!violations.isEmpty()) {
            throw new ApiException(HttpStatus.CONFLICT, "QUOTA_BELOW_USAGE",
                "Le quota doit être supérieur à l'utilisation actuelle : " + String.join(", ", violations));
        }
    }

    public void delete(UUID id) {
        quotaRepository.deleteById(id);
        log.info("Deleted quota {}", id);
    }

    /**
     * Real allocation usage for a service environment: summed CPU/RAM/disk of VMs
     * and pods of K8s deployments. Units match the quota limits (CPU cores, RAM MB,
     * storage GB, pods count).
     */
    public QuotaUsageResponse usageFor(UUID serviceEnvironmentId) {
        double cpu = 0;
        double ram = 0;
        double storage = 0;
        int pods = 0;

        List<Vm> vms = vmRepository.findByServiceEnvironmentId(serviceEnvironmentId);
        for (Vm vm : vms) {
            cpu += vm.getCpu();
            ram += vm.getRam();
            storage += vm.getDisk();
        }

        List<K8sDeployment> deployments = k8sDeploymentRepository.findByServiceEnvironmentId(serviceEnvironmentId);
        for (K8sDeployment deployment : deployments) {
            pods += deployment.getReplicas();
        }

        return new QuotaUsageResponse(cpu, ram, storage, pods, Instant.now());
    }
}
