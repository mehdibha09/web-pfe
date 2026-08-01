package com.cloud_pricer.web.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;

import com.cloud_pricer.config.TenantValidator;
import com.cloud_pricer.config.UserContext;
import com.cloud_pricer.domain.Quota;
import com.cloud_pricer.service.AuditService;
import com.cloud_pricer.service.QuotaService;
import com.cloud_pricer.web.dto.quota.QuotaRequest;
import com.cloud_pricer.web.dto.quota.QuotaResponse;
import com.cloud_pricer.web.routes.ApiRoutes;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(ApiRoutes.Quota.BASE)
@RequiredArgsConstructor
public class QuotaController {

  private final QuotaService quotaService;
  private final TenantValidator tenantValidator;
  private final AuditService auditService;

  @GetMapping
  public ResponseEntity<Page<QuotaResponse>> getAll(@PageableDefault(size = 10) Pageable pageable) {
    UserContext.requirePermission("QUOTA_READ");
    List<QuotaResponse> list = quotaService.getAll().stream().map(this::map).toList();
    int start = (int) pageable.getOffset();
    int end = Math.min(start + pageable.getPageSize(), list.size());
    List<QuotaResponse> content = start < list.size() ? list.subList(start, end) : List.of();
    return ResponseEntity.ok(new PageImpl<>(content, pageable, list.size()));
  }

  @GetMapping("/{id}")
  public ResponseEntity<QuotaResponse> getById(@PathVariable UUID id) {
    UserContext.requirePermission("QUOTA_READ");
    return ResponseEntity.ok(map(quotaService.getById(id)));
  }

  @PostMapping
  public ResponseEntity<QuotaResponse> create(@Valid @RequestBody QuotaRequest dto) {
    UserContext.requirePermission("QUOTA_MANAGE");
    tenantValidator.validateServiceEnvironment(dto.serviceEnvironmentId());
    Quota quota = new Quota();
    quota.setServiceEnvironmentId(dto.serviceEnvironmentId());
    quota.setMaxCpu(dto.maxCpu());
    quota.setMaxRam(dto.maxRam());
    quota.setMaxStorage(dto.maxStorage());
    quota.setMaxPods(dto.maxPods());
    quota.setMaxBudget(dto.maxBudget());
    quota.setPeriod(dto.period());
    quota.setActive(dto.isActive());
    quota.setTenantId(UserContext.getTenantId());

    Quota created = quotaService.create(quota);
    auditService.record("QUOTA_CREATE", "quota", created.getId().toString(),
        "Quota created (serviceEnvironmentId=" + created.getServiceEnvironmentId() + ", period='" + created.getPeriod() + "')");
    return ResponseEntity.status(HttpStatus.CREATED).body(map(created));
  }

  @PatchMapping("/{id}")
  public ResponseEntity<QuotaResponse> update(@PathVariable UUID id, @Valid @RequestBody QuotaRequest dto) {
    UserContext.requirePermission("QUOTA_MANAGE");
    tenantValidator.validateServiceEnvironment(dto.serviceEnvironmentId());
    Quota quota = new Quota();
    quota.setServiceEnvironmentId(dto.serviceEnvironmentId());
    quota.setMaxCpu(dto.maxCpu());
    quota.setMaxRam(dto.maxRam());
    quota.setMaxStorage(dto.maxStorage());
    quota.setMaxPods(dto.maxPods());
    quota.setMaxBudget(dto.maxBudget());
    quota.setPeriod(dto.period());
    quota.setActive(dto.isActive());

    Quota updated = quotaService.update(id, quota);
    auditService.record("QUOTA_UPDATE", "quota", updated.getId().toString(), "Quota updated (id=" + updated.getId() + ")");
    return ResponseEntity.ok(map(updated));
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> delete(@PathVariable UUID id) {
    UserContext.requirePermission("QUOTA_MANAGE");
    quotaService.delete(id);
    auditService.record("QUOTA_DELETE", "quota", id.toString(), "Quota deleted (id=" + id + ")");
    return ResponseEntity.noContent().build();
  }

  private QuotaResponse map(Quota quota) {
    return new QuotaResponse(
        quota.getId(),
        quota.getServiceEnvironmentId(),
        quota.getMaxCpu(),
        quota.getMaxRam(),
        quota.getMaxStorage(),
        quota.getMaxPods(),
        quota.getMaxBudget(),
        quota.getPeriod(),
        quota.isActive(),
        quota.getCreatedAt(),
        quota.getUpdatedAt());
  }
}
