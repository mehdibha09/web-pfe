package com.cloud_pricer.domain;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

@Entity
@Table(name = "alert")
public class Alert {

  @Id
  private UUID id;

  @Column(name = "tenant_id", nullable = false)
  private UUID tenantId;

  @Column(name = "service_environment_id", nullable = false)
  private UUID serviceEnvironmentId;

  @Column(nullable = false)
  private String type;

  @Column(nullable = false)
  private String metric;

  private double threshold;

  @Column(name = "actual_value")
  private double actualValue;

  @Column(nullable = false)
  private String severity;

  @Column(nullable = false)
  private String status;

  private String message;

  @Column(nullable = false)
  private Instant createdAt;

  @Column(name = "acknowledged_by")
  private String acknowledgedBy;

  @Column(name = "resolved_at")
  private Instant resolvedAt;

  public Alert() {
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

  public String getType() {
    return type;
  }

  public void setType(String type) {
    this.type = type;
  }

  public String getMetric() {
    return metric;
  }

  public void setMetric(String metric) {
    this.metric = metric;
  }

  public double getThreshold() {
    return threshold;
  }

  public void setThreshold(double threshold) {
    this.threshold = threshold;
  }

  public double getActualValue() {
    return actualValue;
  }

  public void setActualValue(double actualValue) {
    this.actualValue = actualValue;
  }

  public String getSeverity() {
    return severity;
  }

  public void setSeverity(String severity) {
    this.severity = severity;
  }

  public String getStatus() {
    return status;
  }

  public void setStatus(String status) {
    this.status = status;
  }

  public String getMessage() {
    return message;
  }

  public void setMessage(String message) {
    this.message = message;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public void setCreatedAt(Instant createdAt) {
    this.createdAt = createdAt;
  }

  public String getAcknowledgedBy() {
    return acknowledgedBy;
  }

  public void setAcknowledgedBy(String acknowledgedBy) {
    this.acknowledgedBy = acknowledgedBy;
  }

  public Instant getResolvedAt() {
    return resolvedAt;
  }

  public void setResolvedAt(Instant resolvedAt) {
    this.resolvedAt = resolvedAt;
  }

  @PrePersist
  void onCreate() {
    if (id == null) {
      id = UUID.randomUUID();
    }
    if (createdAt == null) {
      createdAt = Instant.now();
    }
    if (status == null) {
      status = "OPEN";
    }
  }
}
