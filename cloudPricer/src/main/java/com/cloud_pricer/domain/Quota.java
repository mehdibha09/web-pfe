package com.cloud_pricer.domain;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

@Entity
@Table(name = "quota")
public class Quota {

  @Id
  private UUID id;

  @Column(name = "service_environment_id", nullable = false)
  private UUID serviceEnvironmentId;

  @Column(name = "max_cpu")
  private double maxCpu;

  @Column(name = "max_ram")
  private double maxRam;

  @Column(name = "max_storage")
  private double maxStorage;

  @Column(name = "max_pods")
  private int maxPods;

  @Column(name = "max_budget")
  private double maxBudget;

  @Column(nullable = false)
  private String period;

  @Column(nullable = false)
  private boolean isActive;

  @Column(nullable = false)
  private Instant createdAt;

  @Column(nullable = false)
  private Instant updatedAt;

  @Column(name = "tenant_id", nullable = false)
  private UUID tenantId;

  public Quota() {
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

  public double getMaxCpu() {
    return maxCpu;
  }

  public void setMaxCpu(double maxCpu) {
    this.maxCpu = maxCpu;
  }

  public double getMaxRam() {
    return maxRam;
  }

  public void setMaxRam(double maxRam) {
    this.maxRam = maxRam;
  }

  public double getMaxStorage() {
    return maxStorage;
  }

  public void setMaxStorage(double maxStorage) {
    this.maxStorage = maxStorage;
  }

  public int getMaxPods() {
    return maxPods;
  }

  public void setMaxPods(int maxPods) {
    this.maxPods = maxPods;
  }

  public double getMaxBudget() {
    return maxBudget;
  }

  public void setMaxBudget(double maxBudget) {
    this.maxBudget = maxBudget;
  }

  public String getPeriod() {
    return period;
  }

  public void setPeriod(String period) {
    this.period = period;
  }

  public boolean isActive() {
    return isActive;
  }

  public void setActive(boolean isActive) {
    this.isActive = isActive;
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

  public UUID getTenantId() {
    return tenantId;
  }

  public void setTenantId(UUID tenantId) {
    this.tenantId = tenantId;
  }

  @PrePersist
  void onCreate() {
    if (id == null) {
      id = UUID.randomUUID();
    }
    if (createdAt == null) {
      createdAt = Instant.now();
      updatedAt = createdAt;
    }
    if (!isActive) {
      isActive = true;
    }
  }

  @PreUpdate
  void onUpdate() {
    updatedAt = Instant.now();
  }
}
