package com.cloud_pricer.domain;

import java.time.Instant;
import java.util.UUID;

import org.hibernate.annotations.Immutable;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * Read-only view of the shared {@code k8s_deployment} table (owned by deployment-service).
 * Used by cost auto-generation (Model A: allocation x RUNNING duration).
 */
@Entity
@Immutable
@Table(name = "k8s_deployment")
public class K8sDeployment {

  @Id
  private UUID id;

  @Column(nullable = false)
  private String name;

  @Column(nullable = false)
  private int replicas;

  @Column(name = "cpu_request")
  private String cpuRequest;

  @Column(name = "memory_request")
  private String memoryRequest;

  @Column(nullable = false)
  private String status;

  @Column(name = "tenant_id", nullable = false)
  private UUID tenantId;

  @Column(name = "service_environment_id", nullable = false)
  private UUID serviceEnvironmentId;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  public UUID getId() { return id; }
  public String getName() { return name; }
  public int getReplicas() { return replicas; }
  public String getCpuRequest() { return cpuRequest; }
  public String getMemoryRequest() { return memoryRequest; }
  public String getStatus() { return status; }
  public UUID getTenantId() { return tenantId; }
  public UUID getServiceEnvironmentId() { return serviceEnvironmentId; }
  public Instant getCreatedAt() { return createdAt; }
}
