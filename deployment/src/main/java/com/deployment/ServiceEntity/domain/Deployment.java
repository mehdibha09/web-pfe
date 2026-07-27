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
import jakarta.persistence.Transient;

@Entity
@Table(name = "deployment")
public class Deployment {

  public enum Status {
    QUEUED,
    SUCCESS,
    FAILED,
    ROLLED_BACK
  }

  @Id
  private UUID id;

  @Column(nullable = false)
  private String version;

  @Column(nullable = false)
  @Enumerated(EnumType.STRING)
  private Status status;

  @Column(nullable = false)
  private String notes;

  @Column(name = "deployed_by")
  private UUID deployedBy;

  @Column(name = "service_environment_id", nullable = false)
  private UUID serviceEnvironmentId;

  @Transient
  private UUID tenantId;

  @Transient
  private Instant deployedAt;

  @Column(nullable = false)
  private Instant createdAt;

  @Column(nullable = false)
  private Instant updatedAt;

  public Deployment() {
  }

  public UUID getId() {
    return id;
  }

  public void setId(UUID id) {
    this.id = id;
  }

  public String getVersion() {
    return version;
  }

  public void setVersion(String version) {
    this.version = version;
  }

  public Status getStatus() {
    return status;
  }

  public void setStatus(Status status) {
    this.status = status;
  }

  public String getNotes() {
    return notes;
  }

  public void setNotes(String notes) {
    this.notes = notes;
  }

  public UUID getDeployedBy() {
    return deployedBy;
  }

  public void setDeployedBy(UUID deployedBy) {
    this.deployedBy = deployedBy;
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

  public Instant getDeployedAt() {
    return deployedAt;
  }

  public void setDeployedAt(Instant deployedAt) {
    this.deployedAt = deployedAt;
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
    if (status == null) {
      status = Status.QUEUED;
    }
  }

  @PreUpdate
  void onUpdate() {
    updatedAt = Instant.now();
  }
}
