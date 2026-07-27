package com.deployment.ServiceEntity.domain;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;

@Entity
@Table(name = "metric")
public class Metric {

  @Id
  private UUID id;

  @Column(name = "service_environment_id", nullable = false)
  private UUID serviceEnvironmentId;

  @Transient
  private UUID tenantId;

  @Column(nullable = false)
  private float cpuUsage;

  @Column(nullable = false)
  private float ramUsage;

  @Column(nullable = false)
  private float networkUsage;

  @Column(nullable = false)
  private float diskUsage;

  @Column(nullable = false)
  private int pods;

  @Column(nullable = false)
  private Instant timestamp;

  @Column(nullable = false)
  private Instant createdAt;

  @Column(nullable = false)
  private Instant updatedAt;

  @Column(name = "vm_id")
  private UUID vmId;

  public Metric() {
  }

  public UUID getId() {
    return id;
  }

  public void setId(UUID id) {
    this.id = id;
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

  public float getCpuUsage() {
    return cpuUsage;
  }

  public void setCpuUsage(float cpuUsage) {
    this.cpuUsage = cpuUsage;
  }

  public float getRamUsage() {
    return ramUsage;
  }

  public void setRamUsage(float ramUsage) {
    this.ramUsage = ramUsage;
  }

  public float getNetworkUsage() {
    return networkUsage;
  }

  public void setNetworkUsage(float networkUsage) {
    this.networkUsage = networkUsage;
  }

  public float getDiskUsage() {
    return diskUsage;
  }

  public void setDiskUsage(float diskUsage) {
    this.diskUsage = diskUsage;
  }

  public int getPods() {
    return pods;
  }

  public void setPods(int pods) {
    this.pods = pods;
  }

  public Instant getTimestamp() {
    return timestamp;
  }

  public void setTimestamp(Instant timestamp) {
    this.timestamp = timestamp;
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

  public UUID getVmId() {
    return vmId;
  }

  public void setVmId(UUID vmId) {
    this.vmId = vmId;
  }

  @PrePersist
  void onCreate() {
    if (id == null) {
      id = UUID.randomUUID();
    }
    Instant now = Instant.now();
    if (timestamp == null) {
      timestamp = now;
    }
    if (createdAt == null) {
      createdAt = now;
    }
    updatedAt = now;
  }

  @PreUpdate
  void onUpdate() {
    updatedAt = Instant.now();
  }
}
