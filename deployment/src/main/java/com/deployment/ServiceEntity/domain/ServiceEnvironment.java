package com.deployment.ServiceEntity.domain;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

@Entity
@Table(name = "service_environment")
public class ServiceEnvironment {
  @Id
  private UUID id;

  @Column(name = "service_id", nullable = false)
  private UUID serviceId;

  @Column(name = "environment_id", nullable = false)
  private UUID environmentId;

  @Column(name = "tenant_id", nullable = false)
  private UUID tenantId;

  @Column(nullable = false)
  private Instant createdAt;

  @Column(nullable = false)
  private Instant updatedAt;

  public ServiceEnvironment() {
  }

  public UUID getId() {
    return id;
  }

  public void setId(UUID id) {
    this.id = id;
  }

  public UUID getServiceId() {
    return serviceId;
  }

  public void setServiceId(UUID serviceId) {
    this.serviceId = serviceId;
  }

  public UUID getEnvironmentId() {
    return environmentId;
  }

  public void setEnvironmentId(UUID environmentId) {
    this.environmentId = environmentId;
  }

  public UUID getTenantId() {
    return tenantId;
  }

  public void setTenantId(UUID tenantId) {
    this.tenantId = tenantId;
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
  }

  @PreUpdate
  void onUpdate() {
    updatedAt = Instant.now();
  }
}
