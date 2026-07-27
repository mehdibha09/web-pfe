package com.cloud_pricer.domain;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

@Entity
@Table(name = "cost_breakdown")
public class CostBreakdown {

  @Id
  private UUID id;

  @Column(name = "cost_record_id", nullable = false)
  private UUID costRecordId;

  @Column(nullable = false)
  private String type;

  @Column(name = "unit_cost", nullable = false)
  private double unitCost;

  @Column(nullable = false)
  private double quantity;

  @Column(nullable = false)
  private double total;

  @Column(nullable = false)
  private Instant createdAt;

  public CostBreakdown() {
  }

  public UUID getId() {
    return id;
  }

  public void setId(UUID id) {
    this.id = id;
  }

  public UUID getCostRecordId() {
    return costRecordId;
  }

  public void setCostRecordId(UUID costRecordId) {
    this.costRecordId = costRecordId;
  }

  public String getType() {
    return type;
  }

  public void setType(String type) {
    this.type = type;
  }

  public double getUnitCost() {
    return unitCost;
  }

  public void setUnitCost(double unitCost) {
    this.unitCost = unitCost;
  }

  public double getQuantity() {
    return quantity;
  }

  public void setQuantity(double quantity) {
    this.quantity = quantity;
  }

  public double getTotal() {
    return total;
  }

  public void setTotal(double total) {
    this.total = total;
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
    total = unitCost * quantity;
  }
}
