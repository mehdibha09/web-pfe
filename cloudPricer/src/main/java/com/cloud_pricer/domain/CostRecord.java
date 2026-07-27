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
@Table(name = "cost_record")
public class CostRecord {

  @Id
  private UUID id;

  @Column(name = "tenant_id", nullable = false)
  private UUID tenantId;

  @Column(name = "service_environment_id", nullable = false)
  private UUID serviceEnvironmentId;

  @Column(name = "period_start", nullable = false)
  private Instant periodStart;

  @Column(name = "period_end", nullable = false)
  private Instant periodEnd;

  @Column(nullable = false)
  private String mode;

  @Column(name = "compute_cost")
  private double computeCost;

  @Column(name = "storage_cost")
  private double storageCost;

  @Column(name = "network_cost")
  private double networkCost;

  @Column(name = "backup_cost")
  private double backupCost;

  @Column(name = "os_cost")
  private double osCost;

  @Column(name = "total_cost", nullable = false)
  private double totalCost;

  @Column(nullable = false)
  private Instant createdAt;

  @Column(nullable = false)
  private Instant updatedAt;

  public CostRecord() {
  }

  public UUID getId() {
    return id;
  }

  public void setId(UUID id) {
    this.id = id;
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

  public void setServiceEnvironmentId(UUID serviceEnvironmentId) {
    this.serviceEnvironmentId = serviceEnvironmentId;
  }

  public Instant getPeriodStart() {
    return periodStart;
  }

  public void setPeriodStart(Instant periodStart) {
    this.periodStart = periodStart;
  }

  public Instant getPeriodEnd() {
    return periodEnd;
  }

  public void setPeriodEnd(Instant periodEnd) {
    this.periodEnd = periodEnd;
  }

  public String getMode() {
    return mode;
  }

  public void setMode(String mode) {
    this.mode = mode;
  }

  public double getComputeCost() {
    return computeCost;
  }

  public void setComputeCost(double computeCost) {
    this.computeCost = computeCost;
  }

  public double getStorageCost() {
    return storageCost;
  }

  public void setStorageCost(double storageCost) {
    this.storageCost = storageCost;
  }

  public double getNetworkCost() {
    return networkCost;
  }

  public void setNetworkCost(double networkCost) {
    this.networkCost = networkCost;
  }

  public double getBackupCost() {
    return backupCost;
  }

  public void setBackupCost(double backupCost) {
    this.backupCost = backupCost;
  }

  public double getOsCost() {
    return osCost;
  }

  public void setOsCost(double osCost) {
    this.osCost = osCost;
  }

  public double getTotalCost() {
    return totalCost;
  }

  public void setTotalCost(double totalCost) {
    this.totalCost = totalCost;
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

  @PrePersist
  void onCreate() {
    if (id == null) {
      id = UUID.randomUUID();
    }
    if (createdAt == null) {
      createdAt = Instant.now();
      updatedAt = createdAt;
    }
    totalCost = computeCost + storageCost + networkCost + backupCost + osCost;
  }

  @PreUpdate
  void onUpdate() {
    updatedAt = Instant.now();
    totalCost = computeCost + storageCost + networkCost + backupCost + osCost;
  }
}
