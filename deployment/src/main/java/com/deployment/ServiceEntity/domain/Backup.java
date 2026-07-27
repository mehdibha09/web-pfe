package com.deployment.ServiceEntity.domain;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

@Entity
@Table(name = "backup")
public class Backup {

    public enum Status {
        PENDING, COMPLETED, FAILED, RESTORED
    }

    public enum Type {
        MANUAL, AUTOMATIC
    }

    @Id
    private UUID id;

    @Column(name = "vm_id")
    private UUID vmId;

    @Column(name = "service_environment_id", nullable = false)
    private UUID serviceEnvironmentId;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private Status status;

    @Column(name = "file_path")
    private String filePath;

    @Column(name = "size_mb")
    private Long sizeMb;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private Type type;

    private String notes;

    @Column(nullable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private Instant updatedAt;

    @Column(name = "restored_at")
    private Instant restoredAt;

    public Backup() {}

    @PrePersist
    void onCreate() {
        if (id == null) {
            id = UUID.randomUUID();
        }
        if (createdAt == null) {
            createdAt = Instant.now();
            updatedAt = createdAt;
        }
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getVmId() {
        return vmId;
    }

    public void setVmId(UUID vmId) {
        this.vmId = vmId;
    }

    public UUID getServiceEnvironmentId() {
        return serviceEnvironmentId;
    }

    public void setServiceEnvironmentId(UUID serviceEnvironmentId) {
        this.serviceEnvironmentId = serviceEnvironmentId;
    }

    public UUID getTenantId() {
        return tenantId;
    }

    public void setTenantId(UUID tenantId) {
        this.tenantId = tenantId;
    }

    public Status getStatus() {
        return status;
    }

    public void setStatus(Status status) {
        this.status = status;
    }

    public String getFilePath() {
        return filePath;
    }

    public void setFilePath(String filePath) {
        this.filePath = filePath;
    }

    public Long getSizeMb() {
        return sizeMb;
    }

    public void setSizeMb(Long sizeMb) {
        this.sizeMb = sizeMb;
    }

    public Type getType() {
        return type;
    }

    public void setType(Type type) {
        this.type = type;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
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

    public Instant getRestoredAt() {
        return restoredAt;
    }

    public void setRestoredAt(Instant restoredAt) {
        this.restoredAt = restoredAt;
    }
}
