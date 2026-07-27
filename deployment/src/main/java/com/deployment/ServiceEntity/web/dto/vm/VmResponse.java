package com.deployment.ServiceEntity.web.dto.vm;

import java.time.Instant;
import java.util.UUID;

import com.deployment.ServiceEntity.domain.Vm;

public class VmResponse {

    private UUID id;
    private String name;
    private int cpu;
    private String vboxName;
    private int ram;
    private int disk;
    private String os;
    private String status;
    private UUID tenantId;
    private UUID serviceEnvironmentId;
    private String ipAddress;
    private Integer sshPort;
    private String sshUser;
    private String vagrantPath;
    private String networkName;
    private boolean backupEnabled;
    private UUID createdBy;
    private UUID updatedBy;
    private Instant createdAt;
    private Instant updatedAt;

    // ── Static factory ────────────────────────────────────────────────────────
    public static VmResponse from(Vm vm) {
        VmResponse r = new VmResponse();
        r.id = vm.getId();
        r.name = vm.getName();
        r.cpu = vm.getCpu();
        r.ram = vm.getRam();
        r.disk = vm.getDisk();
        r.os = vm.getOs().name();
        r.status = vm.getStatus().name();
        r.tenantId = vm.getTenantId();
        r.serviceEnvironmentId = vm.getServiceEnvironmentId();
        r.ipAddress = vm.getIpAddress();
        r.sshPort = vm.getSshPort();
        r.sshUser = vm.getSshUser();
        r.vagrantPath = vm.getVagrantPath();
        r.vboxName = vm.getVboxName();
        r.networkName = vm.getNetworkName();
        r.backupEnabled = vm.isBackupEnabled();
        r.createdBy = vm.getCreatedBy();
        r.updatedBy = vm.getUpdatedBy();
        r.createdAt = vm.getCreatedAt();
        r.updatedAt = vm.getUpdatedAt();
        return r;
    }

    // ── Getters & Setters ─────────────────────────────────────────────────────

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public int getCpu() {
        return cpu;
    }

    public void setCpu(int cpu) {
        this.cpu = cpu;
    }

    public int getRam() {
        return ram;
    }

    public void setRam(int ram) {
        this.ram = ram;
    }

    public int getDisk() {
        return disk;
    }

    public void setDisk(int disk) {
        this.disk = disk;
    }

    public String getOs() {
        return os;
    }

    public void setOs(String os) {
        this.os = os;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public UUID getTenantId() {
        return tenantId;
    }

    public void setTenantId(UUID tenantId) {
        this.tenantId = tenantId;
    }

    public UUID getServiceEnvironmentId() {
        return serviceEnvironmentId;
    }

    public void setServiceEnvironmentId(UUID id) {
        this.serviceEnvironmentId = id;
    }

    public String getIpAddress() {
        return ipAddress;
    }

    public void setIpAddress(String ipAddress) {
        this.ipAddress = ipAddress;
    }

    public Integer getSshPort() {
        return sshPort;
    }

    public void setSshPort(Integer sshPort) {
        this.sshPort = sshPort;
    }

    public String getSshUser() {
        return sshUser;
    }

    public void setSshUser(String sshUser) {
        this.sshUser = sshUser;
    }

    public String getVagrantPath() {
        return vagrantPath;
    }

    public void setVagrantPath(String vagrantPath) {
        this.vagrantPath = vagrantPath;
    }

    public String getNetworkName() {
        return networkName;
    }

    public void setNetworkName(String networkName) {
        this.networkName = networkName;
    }

    public boolean isBackupEnabled() {
        return backupEnabled;
    }

    public void setBackupEnabled(boolean backupEnabled) {
        this.backupEnabled = backupEnabled;
    }

    public UUID getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(UUID createdBy) {
        this.createdBy = createdBy;
    }

    public UUID getUpdatedBy() {
        return updatedBy;
    }

    public void setUpdatedBy(UUID updatedBy) {
        this.updatedBy = updatedBy;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }

    public String getVboxName() {
        return vboxName;
    }

    public void setVboxName(String v) {
        this.vboxName = v;
    }

}