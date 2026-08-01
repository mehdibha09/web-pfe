package com.deployment.ServiceEntity.domain;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;

@Entity
@Table(name = "vm")
public class Vm {

    public enum Status {
        RUNNING, PENDING, STOPPED, TERMINATED, FAILED
    }

    public enum Os {
        UBUNTU_22_04("ubuntu/jammy64"),
        UBUNTU_20_04("ubuntu/focal64"),
        DEBIAN_11("debian/bullseye64"),
        CENTOS_7("centos/7");

        private final String vagrantBox;

        Os(String vagrantBox) {
            this.vagrantBox = vagrantBox;
        }

        public String getVagrantBox() {
            return vagrantBox;
        }
    }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Column
    private String displayName;

    @Column(nullable = false)
    private int cpu;

    @Column(nullable = false)
    private int ram;

    @Column(nullable = false)
    private int disk;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Os os;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status;

    @Column(nullable = false)
    private UUID tenantId;

    @Column(name = "service_environment_id", nullable = false)
    private UUID serviceEnvironmentId;

    @Column
    private String ipAddress;

    @Column
    private Integer sshPort;

    @Column
    private String sshUser = "vagrant";

    @Column
    private String vagrantPath;

    @Column
    private String networkName;

    @Column
    private String vboxName; // ← nom exact dans VirtualBox

    @Column(nullable = false)
    private boolean backupEnabled = false;

    @Transient
    private UUID createdBy;

    @Transient
    private UUID updatedBy;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private Instant updatedAt;

    @PrePersist
    protected void onCreate() {
        Instant now = Instant.now();
        this.createdAt = now;
        this.updatedAt = now;
        if (this.status == null)
            this.status = Status.PENDING;
        if (this.sshUser == null)
            this.sshUser = "vagrant";
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = Instant.now();
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

    public String getDisplayName() {
        return displayName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
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

    public Os getOs() {
        return os;
    }

    public void setOs(Os os) {
        this.os = os;
    }

    public Status getStatus() {
        return status;
    }

    public void setStatus(Status status) {
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

    public String getVboxName() {
        return vboxName;
    }

    public void setVboxName(String vboxName) {
        this.vboxName = vboxName;
    }

    public boolean isBackupEnabled() {
        return backupEnabled;
    }

    public void setBackupEnabled(boolean b) {
        this.backupEnabled = b;
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

}