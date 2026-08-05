package com.cloud_pricer.domain;

import java.time.Instant;
import java.util.UUID;

import org.hibernate.annotations.Immutable;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * Read-only view of the shared {@code vm} table (owned by deployment-service).
 * Used by cost auto-generation (Model A: allocation x RUNNING duration).
 */
@Entity
@Immutable
@Table(name = "vm")
public class Vm {

  @Id
  private UUID id;

  @Column(nullable = false)
  private String name;

  @Column(nullable = false)
  private int cpu;

  @Column(nullable = false)
  private int ram;

  @Column(nullable = false)
  private int disk;

  @Column(nullable = false)
  private String os;

  @Column(nullable = false)
  private String status;

  @Column(name = "tenant_id", nullable = false)
  private UUID tenantId;

  @Column(name = "service_environment_id", nullable = false)
  private UUID serviceEnvironmentId;

  @Column(name = "backup_enabled", nullable = false)
  private boolean backupEnabled;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  public UUID getId() { return id; }
  public String getName() { return name; }
  public int getCpu() { return cpu; }
  public int getRam() { return ram; }
  public int getDisk() { return disk; }
  public String getOs() { return os; }
  public String getStatus() { return status; }
  public UUID getTenantId() { return tenantId; }
  public UUID getServiceEnvironmentId() { return serviceEnvironmentId; }
  public boolean isBackupEnabled() { return backupEnabled; }
  public Instant getCreatedAt() { return createdAt; }
}
