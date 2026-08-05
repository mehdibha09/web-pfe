package com.deployment.ServiceEntity.service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.deployment.ServiceEntity.config.UserContext;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import com.deployment.ServiceEntity.domain.Metric;
import com.deployment.ServiceEntity.domain.DirectSshVmClient;
import com.deployment.ServiceEntity.domain.ServiceEnvironment;
import com.deployment.ServiceEntity.domain.VmClient;
import com.deployment.ServiceEntity.domain.VagrantSshConfig;
import com.deployment.ServiceEntity.domain.Vm;
import com.deployment.ServiceEntity.exception.ApiException;
import com.deployment.ServiceEntity.repository.BackupRepository;
import com.deployment.ServiceEntity.repository.MetricRepository;
import com.deployment.ServiceEntity.repository.ServiceEnvironmentRepository;
import com.deployment.ServiceEntity.repository.VmRepository;
import com.deployment.ServiceEntity.web.dto.vm.VmMetricsSnapshot;
import com.deployment.ServiceEntity.web.dto.vm.VmRequest;
import com.deployment.ServiceEntity.web.dto.vm.VmResponse;
import com.deployment.ServiceEntity.web.dto.vm.VmStatusResponse;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class VmService {

    private final VmRepository vmRepository;
    private final MetricRepository metricRepository;
    private final BackupRepository backupRepository;
    private final VmClient vagrantClient;
    private final VmProvisioningService provisioningService;
    private final ServiceEnvironmentRepository serviceEnvironmentRepository;
    private final QuotaEnforcementService quotaEnforcementService;

    // ── Client dispatch helpers ──────────────────────────────────────────────
    // Delegate to Vm-aware overloads when using DirectSshVmClient

    private String clientStatus(Vm vm) {
        if (vagrantClient instanceof DirectSshVmClient) {
            return ((DirectSshVmClient) vagrantClient).status(vm);
        }
        return vagrantClient.status(vm.getVagrantPath());
    }

    private VmMetricsSnapshot clientQueryMetrics(Vm vm) {
        if (vagrantClient instanceof DirectSshVmClient) {
            return ((DirectSshVmClient) vagrantClient).queryMetrics(vm);
        }
        return vagrantClient.queryMetrics(vm.getVboxName());
    }

    private VagrantSshConfig clientGetSshConfig(Vm vm) {
        if (vagrantClient instanceof DirectSshVmClient) {
            return ((DirectSshVmClient) vagrantClient).getSshConfig(vm);
        }
        return vagrantClient.getSshConfig(vm.getVagrantPath());
    }

    private String clientExecuteCommand(Vm vm, String command) {
        if (vagrantClient instanceof DirectSshVmClient) {
            return ((DirectSshVmClient) vagrantClient).executeCommand(vm, command);
        }
        return vagrantClient.executeCommand(vm.getVagrantPath(), command);
    }

    // ── CRUD ──────────────────────────────────────────────────────────────────

    public VmResponse create(VmRequest req) {

        log.info("VM REQUEST name={}", req.getName());
        log.info("VM REQUEST tenantId={}", req.getTenantId());
        log.info("VM REQUEST environmentId={}", req.getServiceEnvironmentId());
        log.info("VM REQUEST os={}", req.getOs());

        if (req.getTenantId() == null) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "INVALID_REQUEST",
                    "tenantId is required");
        }

        if (req.getServiceEnvironmentId() == null) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "INVALID_REQUEST",
                    "serviceEnvironmentId is required");
        }

        verifyServiceEnvironmentOwnership(req.getServiceEnvironmentId());
        quotaEnforcementService.enforceVm(req.getServiceEnvironmentId(), req.getCpu(), req.getRam(), req.getDisk());

        if (req.getName() == null || req.getName().isBlank()) {
            req.setName("vm-" + UUID.randomUUID().toString().substring(0, 8));
        }

        Vm vm = new Vm();

        vm.setName(req.getName());
        vm.setDisplayName(req.getDisplayName());
        vm.setCpu(req.getCpu());
        vm.setRam(req.getRam());
        vm.setDisk(req.getDisk());

        vm.setOs(req.getOs());

        vm.setTenantId(req.getTenantId());

        vm.setServiceEnvironmentId(
                req.getServiceEnvironmentId());

        vm.setBackupEnabled(
                req.isBackupEnabled());

        vm.setCreatedBy(UserContext.getUserId());

        vm.setStatus(
                Vm.Status.PENDING);

        String vagrantPath = vagrantClient.getVmPath(
                req.getTenantId().toString(),
                req.getName());

        vm.setVagrantPath(vagrantPath);

        vm.setNetworkName(
                "tenant-" +
                        req.getTenantId()
                                .toString()
                                .substring(0, 8));

        log.info("Vagrant path generated={}", vagrantPath);

        Vm saved = vmRepository.saveAndFlush(vm);

        log.info("VM saved id={}", saved.getId());
        log.info("VM status={}", saved.getStatus());
        log.info("VM path={}", saved.getVagrantPath());

        provisioningService.provisionVmAsync(
                saved.getId());

        return VmResponse.from(saved);
    }

    public VmResponse getById(UUID id) {
        Vm vm = vmRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("VM not found: " + id));
        if (!vm.getTenantId().equals(UserContext.getTenantId())) {
            throw new EntityNotFoundException("VM not found: " + id);
        }
        return VmResponse.from(vm);
    }

    public List<VmResponse> getAll() {
        return vmRepository.findByTenantId(UserContext.getTenantId()).stream().map(VmResponse::from).toList();
    }

    public Page<VmResponse> getAll(UUID serviceEnvironmentId, Pageable pageable) {
        if (serviceEnvironmentId != null) {
            verifyServiceEnvironmentOwnership(serviceEnvironmentId);
            return vmRepository.findByServiceEnvironmentId(serviceEnvironmentId, pageable)
                    .map(VmResponse::from);
        }
        return vmRepository.findByTenantId(UserContext.getTenantId(), pageable).map(VmResponse::from);
    }

    public List<VmResponse> getByServiceEnvironment(UUID serviceEnvironmentId) {
        verifyServiceEnvironmentOwnership(serviceEnvironmentId);
        return vmRepository.findByServiceEnvironmentId(serviceEnvironmentId)
                .stream().map(VmResponse::from).toList();
    }

    private ServiceEnvironment verifyServiceEnvironmentOwnership(UUID serviceEnvironmentId) {
        ServiceEnvironment se = serviceEnvironmentRepository.findById(serviceEnvironmentId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND",
                        "Service environment not found"));
        if (!se.getTenantId().equals(UserContext.getTenantId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN",
                    "Access denied to this service environment");
        }
        return se;
    }

    private Vm requireOwnedVm(UUID id) {
        Vm vm = vmRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("VM not found: " + id));
        if (!vm.getTenantId().equals(UserContext.getTenantId())) {
            throw new EntityNotFoundException("VM not found: " + id);
        }
        return vm;
    }

    public VmResponse update(UUID id, VmRequest req) {
        Vm vm = vmRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("VM not found: " + id));
        if (!vm.getTenantId().equals(UserContext.getTenantId())) {
            throw new EntityNotFoundException("VM not found: " + id);
        }
        if (req.getServiceEnvironmentId() != null) {
            verifyServiceEnvironmentOwnership(req.getServiceEnvironmentId());
        }
        vm.setName(req.getName());
        vm.setDisplayName(req.getDisplayName());
        vm.setCpu(req.getCpu());
        vm.setRam(req.getRam());
        vm.setDisk(req.getDisk());
        vm.setServiceEnvironmentId(req.getServiceEnvironmentId());
        vm.setUpdatedBy(UserContext.getUserId());
        return VmResponse.from(vmRepository.save(vm));
    }

    public void delete(UUID id) {
        Vm vm = requireOwnedVm(id);
        backupRepository.deleteByVmId(id);
        metricRepository.deleteByVmId(id);
        vagrantClient.destroy(vm.getVagrantPath());
        vmRepository.delete(vm);
    }

    public void deleteByServiceEnvironment(UUID serviceEnvironmentId) {
        List<Vm> vms = vmRepository.findByServiceEnvironmentId(serviceEnvironmentId);
        for (Vm vm : vms) {
            backupRepository.deleteByVmId(vm.getId());
            metricRepository.deleteByVmId(vm.getId());
        }
        vmRepository.deleteByServiceEnvironmentId(serviceEnvironmentId);
    }

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    public VmResponse start(UUID id) {
        Vm vm = requireOwnedVm(id);

        String currentStatus = clientStatus(vm);

        if ("running".equals(currentStatus)) {
            if (vm.getStatus() != Vm.Status.RUNNING) {
                vm.setStatus(Vm.Status.RUNNING);
                vmRepository.save(vm);
            }
            throw new ApiException(HttpStatus.CONFLICT, "CONFLICT", "VM is already running");
        }

        try {
            vagrantClient.up(vm.getVagrantPath());
        } catch (RuntimeException e) {
            try {
                vagrantClient.destroy(vm.getVagrantPath());
            } catch (RuntimeException destroyEx) {
                log.warn("Cleanup after failed start also failed: {}", destroyEx.getMessage());
            }
            vm.setStatus(Vm.Status.FAILED);
            vmRepository.save(vm);
            log.error("Failed to start VM {}: {}", vm.getName(), e.getMessage());
            throw new ApiException(HttpStatus.CONFLICT, "VAGRANT_ERROR",
                    "Failed to start VM. Please check that the VM name is not already used and that VirtualBox is accessible. Details: " + sanitizeVagrantError(e.getMessage()));
        }

        vm.setStatus(Vm.Status.RUNNING);
        Vm saved = vmRepository.save(vm);

        // Active la collecte de métriques VirtualBox pour cette VM
        if (vm.getVboxName() != null) {
            try {
                vagrantClient.setupMetrics(vm.getVboxName());
            } catch (Exception e) {
                log.warn("Failed to setup metrics for VM {}: {}", vm.getName(), e.getMessage());
            }
        }

        return VmResponse.from(saved);
    }

    public VmResponse stop(UUID id) {
        Vm vm = requireOwnedVm(id);
        if (vm.getStatus() == Vm.Status.STOPPED) {
            throw new ApiException(HttpStatus.CONFLICT, "CONFLICT", "VM is already stopped");
        }

        String rawStatus = clientStatus(vm);

        if ("poweroff".equals(rawStatus) || "aborted".equals(rawStatus) || "not_created".equals(rawStatus)) {
            log.info("VM {} is already down (Vagrant: {}), updating DB only", vm.getName(), rawStatus);
            vm.setStatus(Vm.Status.STOPPED);
            return VmResponse.from(vmRepository.save(vm));
        }

        try {
            vagrantClient.halt(vm.getVagrantPath());
        } catch (RuntimeException e) {
            log.warn("Vagrant halt failed for VM {}: {}. Forcing DB status to STOPPED", vm.getName(), e.getMessage());
        }

        vm.setStatus(Vm.Status.STOPPED);
        return VmResponse.from(vmRepository.save(vm));
    }

    public VmResponse restart(UUID id) {
        Vm vm = requireOwnedVm(id);
        vm.setStatus(Vm.Status.PENDING);
        vmRepository.save(vm);

        vagrantClient.reload(vm.getVagrantPath());

        vm.setStatus(Vm.Status.RUNNING);
        return VmResponse.from(vmRepository.save(vm));
    }

    // ── Monitoring ────────────────────────────────────────────────────────────

    public VmStatusResponse getStatus(UUID id) {
        Vm vm = requireOwnedVm(id);

        String rawStatus = clientStatus(vm);
        Vm.Status mapped = switch (rawStatus) {
            case "running" -> Vm.Status.RUNNING;
            case "poweroff", "aborted" -> Vm.Status.STOPPED;
            case "not_created" -> Vm.Status.TERMINATED;
            default -> vm.getStatus();
        };
        if (mapped != vm.getStatus()) {
            vm.setStatus(mapped);
            vm = vmRepository.save(vm);
        }

        return VmStatusResponse.from(vm);
    }

    public List<Metric> getMetrics(UUID id) {
        Vm vm = requireOwnedVm(id);

        if (vm.getVboxName() != null && vm.getStatus() == Vm.Status.RUNNING) {
            try {
                VmMetricsSnapshot snapshot = clientQueryMetrics(vm);

                if (snapshot != null) {
                    Metric metric = new Metric();
                    metric.setVmId(vm.getId());
                    metric.setServiceEnvironmentId(vm.getServiceEnvironmentId());
                    metric.setTenantId(vm.getTenantId());

                    // CPU — déjà en %
                    metric.setCpuUsage(snapshot.getCpuUsage());

                    // RAM — kB → MB, puis % du RAM alloué à la VM
                    double ramUsedMb = snapshot.getRamUsageKb() / 1024.0;
                    float ramPercent = vm.getRam() > 0
                            ? (float) (ramUsedMb / vm.getRam() * 100)
                            : 0f;
                    metric.setRamUsage(ramPercent);

                    // Disk — MB → % du disque alloué à la VM (vm.getDisk() en GB)
                    double diskTotalMb = vm.getDisk() * 1024.0;
                    float diskPercent = diskTotalMb > 0
                            ? (float) (snapshot.getDiskUsageMb() / diskTotalMb * 100)
                            : 0f;
                    metric.setDiskUsage(diskPercent);

                    // Network — B/s brut (pas de "total" pour en faire un %)
                    metric.setNetworkUsage((float) snapshot.getNetworkRateBps());

                    metric.setPods(0);
                    metricRepository.save(metric);

                    log.info("Metrics saved for VM {}: cpu={}% ram={}% disk={}% net={}B/s",
                            vm.getName(), metric.getCpuUsage(), metric.getRamUsage(),
                            metric.getDiskUsage(), metric.getNetworkUsage());
                }
            } catch (Exception e) {
                log.warn("Failed to collect metrics for VM {}: {}", vm.getName(), e.getMessage());
            }
        }

        return metricRepository.findByVmIdOrderByTimestampDesc(vm.getId());
    }

    // -- SSH --

    public Map<String, Object> executeSshCommand(UUID id, String command) {
        Vm vm = requireOwnedVm(id);

        if (vm.getStatus() != Vm.Status.RUNNING) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VM_NOT_RUNNING",
                    "VM must be RUNNING to execute SSH commands");
        }

        try {
            String output = clientExecuteCommand(vm, command);
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("vmId", vm.getId());
            result.put("command", command);
            result.put("output", output);
            result.put("exitCode", 0);
            return result;
        } catch (RuntimeException e) {
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("vmId", vm.getId());
            result.put("command", command);
            result.put("output", e.getMessage());
            result.put("exitCode", 1);
            return result;
        }
    }

    public VagrantSshConfig getSshInfo(UUID id) {
        Vm vm = vmRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("VM not found: " + id));

        if (vm.getStatus() != Vm.Status.RUNNING) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VM_NOT_RUNNING",
                    "VM must be RUNNING to get SSH info");
        }

        return clientGetSshConfig(vm);
    }

    private String sanitizeVagrantError(String raw) {
        if (raw == null || raw.isBlank()) {
            return "unknown error";
        }
        String trimmed = raw.trim().replaceAll("\\s+", " ");
        if (trimmed.length() > 240) {
            trimmed = trimmed.substring(0, 240) + "…";
        }
        return trimmed;
    }
}