package com.cloud_pricer.domain;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

@Entity
@Table(name = "cost_forecast")
public class CostForecast {

  @Id
  private UUID id;

  @Column(name = "tenant_id", nullable = false)
  private UUID tenantId;

  @Column(name = "service_environment_id", nullable = false)
  private UUID serviceEnvironmentId;

  @Column(nullable = false)
  private String period;

  @Column(name = "predicted_cost", nullable = false)
  private double predictedCost;

  @Column(name = "confidence_level")
  private double confidenceLevel;

  @Column(nullable = false)
  private Instant createdAt;

  public CostForecast() {
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

  public String getPeriod() {
    return period;
  }

  public void setPeriod(String period) {
    this.period = period;
  }

  public double getPredictedCost() {
    return predictedCost;
  }

  public void setPredictedCost(double predictedCost) {
    this.predictedCost = predictedCost;
  }

  public double getConfidenceLevel() {
    return confidenceLevel;
  }

  public void setConfidenceLevel(double confidenceLevel) {
    this.confidenceLevel = confidenceLevel;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public void setCreatedAt(Instant createdAt) {
    this.createdAt = createdAt;
  }

  @PrePersist
  void onCreate() {
    if (id == null) {
      id = UUID.randomUUID();
    }
    if (createdAt == null) {
      createdAt = Instant.now();
    }
  }
}
