package com.deployment.ServiceEntity.service;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import com.deployment.ServiceEntity.domain.K8sDeployment;
import com.deployment.ServiceEntity.domain.Quota;
import com.deployment.ServiceEntity.domain.Vm;
import com.deployment.ServiceEntity.exception.ApiException;
import com.deployment.ServiceEntity.repository.K8sDeploymentRepository;
import com.deployment.ServiceEntity.repository.QuotaRepository;
import com.deployment.ServiceEntity.repository.VmRepository;

@Service
public class QuotaEnforcementService {

    private final QuotaRepository quotaRepository;
    private final VmRepository vmRepository;
    private final K8sDeploymentRepository k8sDeploymentRepository;

    public QuotaEnforcementService(QuotaRepository quotaRepository,
            VmRepository vmRepository,
            K8sDeploymentRepository k8sDeploymentRepository) {
        this.quotaRepository = quotaRepository;
        this.vmRepository = vmRepository;
        this.k8sDeploymentRepository = k8sDeploymentRepository;
    }

    public void enforceVm(UUID serviceEnvironmentId, int cpu, int ram, int disk) {
        quotaRepository.findFirstByServiceEnvironmentIdAndActiveTrueOrderByCreatedAtDesc(serviceEnvironmentId).ifPresent(quota -> {
            List<Vm> vms = vmRepository.findByServiceEnvironmentId(serviceEnvironmentId);
            double usedCpu = vms.stream().mapToDouble(Vm::getCpu).sum();
            double usedRam = vms.stream().mapToDouble(Vm::getRam).sum();
            double usedDisk = vms.stream().mapToDouble(Vm::getDisk).sum();

            List<String> exceeded = new ArrayList<>();
            if (usedCpu + cpu > quota.getMaxCpu()) {
                exceeded.add("CPU " + fmt(usedCpu + cpu) + "/" + fmt(quota.getMaxCpu()));
            }
            if (usedRam + ram > quota.getMaxRam()) {
                exceeded.add("RAM " + fmt(usedRam + ram) + "/" + fmt(quota.getMaxRam()) + " MB");
            }
            if (usedDisk + disk > quota.getMaxStorage()) {
                exceeded.add("storage " + fmt(usedDisk + disk) + "/" + fmt(quota.getMaxStorage()) + " GB");
            }
            if (!exceeded.isEmpty()) {
                throw new ApiException(HttpStatus.CONFLICT, "QUOTA_EXCEEDED",
                        "Quota exceeded for this service environment: " + String.join(", ", exceeded));
            }
        });
    }

    public void enforceK8s(UUID serviceEnvironmentId, int replicas) {
        enforceK8s(serviceEnvironmentId, replicas, null, null);
    }

    public void enforceK8s(UUID serviceEnvironmentId, int replicas, String cpuRequest, String memoryRequest) {
        quotaRepository.findFirstByServiceEnvironmentIdAndActiveTrueOrderByCreatedAtDesc(serviceEnvironmentId).ifPresent(quota -> {
            List<String> exceeded = new ArrayList<>();

            if (quota.getMaxPods() > 0) {
                long usedPods = k8sDeploymentRepository.findByServiceEnvironmentId(serviceEnvironmentId).stream()
                        .mapToLong(K8sDeployment::getReplicas)
                        .sum();
                if (usedPods + replicas > quota.getMaxPods()) {
                    exceeded.add("pods " + (usedPods + replicas) + "/" + fmt(quota.getMaxPods()));
                }
            }

            if (quota.getMaxCpu() > 0) {
                double usedCpu = k8sDeploymentRepository.findByServiceEnvironmentId(serviceEnvironmentId).stream()
                        .mapToDouble(k -> parseCpuCores(k.getCpuRequest()) * k.getReplicas())
                        .sum();
                double addedCpu = parseCpuCores(cpuRequest) * replicas;
                if (usedCpu + addedCpu > quota.getMaxCpu()) {
                    exceeded.add("CPU " + fmt(usedCpu + addedCpu) + "/" + fmt(quota.getMaxCpu()));
                }
            }

            if (quota.getMaxRam() > 0) {
                double usedRam = k8sDeploymentRepository.findByServiceEnvironmentId(serviceEnvironmentId).stream()
                        .mapToDouble(k -> parseMemoryMb(k.getMemoryRequest()) * k.getReplicas())
                        .sum();
                double addedRam = parseMemoryMb(memoryRequest) * replicas;
                if (usedRam + addedRam > quota.getMaxRam()) {
                    exceeded.add("RAM " + fmt(usedRam + addedRam) + "/" + fmt(quota.getMaxRam()) + " MB");
                }
            }

            if (!exceeded.isEmpty()) {
                throw new ApiException(HttpStatus.CONFLICT, "QUOTA_EXCEEDED",
                        "Quota exceeded for this service environment: " + String.join(", ", exceeded));
            }
        });
    }

    private static double parseCpuCores(String value) {
        if (value == null || value.isBlank()) return 0;
        String v = value.trim().toLowerCase();
        if (v.endsWith("m")) {
            return Double.parseDouble(v.substring(0, v.length() - 1)) / 1000.0;
        }
        return Double.parseDouble(v);
    }

    private static double parseMemoryMb(String value) {
        if (value == null || value.isBlank()) return 0;
        String v = value.trim().toLowerCase();
        double multiplier = 1.0;
        if (v.endsWith("k") || v.endsWith("ki")) {
            multiplier = 1.0 / 1024.0;
            v = v.endsWith("ki") ? v.substring(0, v.length() - 2) : v.substring(0, v.length() - 1);
        } else if (v.endsWith("m")) {
            multiplier = 1.0 / 1000.0;
            v = v.substring(0, v.length() - 1);
        } else if (v.endsWith("g") || v.endsWith("gi")) {
            multiplier = 1024.0;
            v = v.endsWith("gi") ? v.substring(0, v.length() - 2) : v.substring(0, v.length() - 1);
        } else if (v.endsWith("t") || v.endsWith("ti")) {
            multiplier = 1024.0 * 1024.0;
            v = v.endsWith("ti") ? v.substring(0, v.length() - 2) : v.substring(0, v.length() - 1);
        }
        try {
            return Double.parseDouble(v) * multiplier;
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    private String fmt(double v) {
        return v == Math.floor(v) ? String.valueOf((long) v) : String.valueOf(v);
    }

    public void enforceK8sScale(UUID serviceEnvironmentId, int currentReplicas, int newReplicas) {
        quotaRepository.findFirstByServiceEnvironmentIdAndActiveTrueOrderByCreatedAtDesc(serviceEnvironmentId).ifPresent(quota -> {
            if (quota.getMaxPods() <= 0) {
                return;
            }
            long usedPods = k8sDeploymentRepository.findByServiceEnvironmentId(serviceEnvironmentId).stream()
                    .mapToLong(K8sDeployment::getReplicas)
                    .sum();
            long projected = usedPods - currentReplicas + newReplicas;
            if (projected > quota.getMaxPods()) {
                throw new ApiException(HttpStatus.CONFLICT, "QUOTA_EXCEEDED",
                        "Quota exceeded for this service environment: pods " + projected + "/" + quota.getMaxPods());
            }
        });
    }
}
