package com.deployment.ServiceEntity.web.dto.vm;

import java.util.UUID;

import com.deployment.ServiceEntity.domain.Vm;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class VmRequest {

    @NotBlank(message = "Name is required")
    private String name;

    private String displayName;

    @NotNull(message = "CPU is required")
    @Min(value = 1, message = "CPU must be at least 1")
    @Max(value = 32, message = "CPU must be at most 32")
    private Integer cpu;

    @NotNull(message = "RAM is required")
    @Min(value = 512, message = "RAM must be at least 512 MB")
    @Max(value = 65536, message = "RAM must be at most 65536 MB")
    private Integer ram;

    @NotNull(message = "Disk is required")
    @Min(value = 10, message = "Disk must be at least 10 GB")
    @Max(value = 500, message = "Disk must be at most 500 GB")
    private Integer disk;

    @NotNull(message = "OS is required")
    private Vm.Os os;

    @NotNull(message = "Service environment is required")
    private UUID serviceEnvironmentId;

    private UUID tenantId;

    private boolean backupEnabled = false;

    // ── Getters & Setters ─────────────────────────────────────────────────────

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDisplayName() {
        return displayName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }

    public Integer getCpu() {
        return cpu;
    }

    public void setCpu(Integer cpu) {
        this.cpu = cpu;
    }

    public Integer getRam() {
        return ram;
    }

    public void setRam(Integer ram) {
        this.ram = ram;
    }

    public Integer getDisk() {
        return disk;
    }

    public void setDisk(Integer disk) {
        this.disk = disk;
    }

    public Vm.Os getOs() {
        return os;
    }

    public void setOs(Vm.Os os) {
        this.os = os;
    }

    public UUID getServiceEnvironmentId() {
        return serviceEnvironmentId;
    }

    public void setServiceEnvironmentId(UUID id) {
        this.serviceEnvironmentId = id;
    }

    public UUID getTenantId() {
        return tenantId;
    }

    public void setTenantId(UUID tenantId) {
        this.tenantId = tenantId;
    }

    public boolean isBackupEnabled() {
        return backupEnabled;
    }

    public void setBackupEnabled(boolean backupEnabled) {
        this.backupEnabled = backupEnabled;
    }
}