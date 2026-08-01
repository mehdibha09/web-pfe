package com.cloud_pricer.web.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;

import com.cloud_pricer.config.TenantValidator;
import com.cloud_pricer.config.UserContext;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.cloud_pricer.domain.Alert;
import com.cloud_pricer.service.AlertService;
import com.cloud_pricer.service.AuditService;
import com.cloud_pricer.web.dto.alert.AlertRequest;
import com.cloud_pricer.web.dto.alert.AlertResponse;
import com.cloud_pricer.web.routes.ApiRoutes;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping(ApiRoutes.AlertRoute.BASE)
@RequiredArgsConstructor
public class AlertController {

  private final AlertService alertService;
  private final TenantValidator tenantValidator;
  private final AuditService auditService;

  @PostMapping
  public ResponseEntity<AlertResponse> create(@Valid @RequestBody AlertRequest dto) {
    UserContext.requirePermission("ALERT_MANAGE");
    tenantValidator.validateServiceEnvironment(dto.serviceEnvironmentId());
    Alert alert = new Alert();
    alert.setTenantId(UserContext.getTenantId());
    alert.setServiceEnvironmentId(dto.serviceEnvironmentId());
    alert.setType(dto.type());
    alert.setMetric(dto.metric());
    alert.setThreshold(dto.threshold());
    alert.setActualValue(dto.actualValue());
    alert.setSeverity(dto.severity());
    alert.setMessage(dto.message());
    Alert created = alertService.create(alert);
    auditService.record("ALERT_CREATE", "alert", created.getId().toString(),
        "Alert created (type='" + created.getType() + "', metric='" + created.getMetric() + "', severity='" + created.getSeverity() + "')");
    return ResponseEntity.status(HttpStatus.CREATED).body(map(created));
  }

  @GetMapping
  public ResponseEntity<Page<AlertResponse>> getAll(@PageableDefault(size = 10) Pageable pageable) {
    UserContext.requirePermission("ALERT_READ");
    List<AlertResponse> list = alertService.getByTenantId(UserContext.getTenantId()).stream().map(this::map).toList();
    int start = (int) pageable.getOffset();
    int end = Math.min(start + pageable.getPageSize(), list.size());
    List<AlertResponse> content = start < list.size() ? list.subList(start, end) : List.of();
    return ResponseEntity.ok(new PageImpl<>(content, pageable, list.size()));
  }

  @GetMapping("/status/{status}")
  public ResponseEntity<List<AlertResponse>> getByStatus(@PathVariable String status) {
    UserContext.requirePermission("ALERT_READ");
    return ResponseEntity.ok(
        alertService.getByTenantIdAndStatus(UserContext.getTenantId(), status).stream().map(this::map).toList());
  }

  @GetMapping("/severity/{severity}")
  public ResponseEntity<List<AlertResponse>> getBySeverity(@PathVariable String severity) {
    UserContext.requirePermission("ALERT_READ");
    return ResponseEntity.ok(
        alertService.getByTenantIdAndSeverity(UserContext.getTenantId(), severity).stream().map(this::map).toList());
  }

  @PatchMapping("/{id}/acknowledge")
  public ResponseEntity<AlertResponse> acknowledge(@PathVariable UUID id) {
    UserContext.requirePermission("ALERT_MANAGE");
    Alert acknowledged = alertService.acknowledge(id, UserContext.getUserId().toString());
    auditService.record("ALERT_ACKNOWLEDGE", "alert", acknowledged.getId().toString(), "Alert acknowledged (id=" + acknowledged.getId() + ")");
    return ResponseEntity.ok(map(acknowledged));
  }

  @PatchMapping("/{id}/resolve")
  public ResponseEntity<AlertResponse> resolve(@PathVariable UUID id) {
    UserContext.requirePermission("ALERT_MANAGE");
    Alert resolved = alertService.resolve(id);
    auditService.record("ALERT_RESOLVE", "alert", resolved.getId().toString(), "Alert resolved (id=" + resolved.getId() + ")");
    return ResponseEntity.ok(map(resolved));
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> delete(@PathVariable UUID id) {
    UserContext.requirePermission("ALERT_MANAGE");
    alertService.delete(id);
    auditService.record("ALERT_DELETE", "alert", id.toString(), "Alert deleted (id=" + id + ")");
    return ResponseEntity.noContent().build();
  }

  private AlertResponse map(Alert alert) {
    return new AlertResponse(
        alert.getId(),
        alert.getTenantId(),
        alert.getServiceEnvironmentId(),
        alert.getType(),
        alert.getMetric(),
        alert.getThreshold(),
        alert.getActualValue(),
        alert.getSeverity(),
        alert.getStatus(),
        alert.getMessage(),
        alert.getCreatedAt(),
        alert.getAcknowledgedBy(),
        alert.getResolvedAt());
  }
}
