package com.cloud_pricer.web.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;

import com.cloud_pricer.config.TenantValidator;
import com.cloud_pricer.config.UserContext;
import com.cloud_pricer.service.AuditService;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.cloud_pricer.domain.CostBreakdown;
import com.cloud_pricer.domain.CostForecast;
import com.cloud_pricer.domain.CostRecord;
import com.cloud_pricer.service.CostRecordService;
import com.cloud_pricer.service.ForecastService;
import com.cloud_pricer.web.dto.cost.CostAggregateResponse;
import com.cloud_pricer.web.dto.cost.CostBreakdownRequest;
import com.cloud_pricer.web.dto.cost.CostBreakdownResponse;
import com.cloud_pricer.web.dto.cost.CostRecordRequest;
import com.cloud_pricer.web.dto.cost.CostRecordResponse;
import com.cloud_pricer.web.dto.cost.ForecastResponse;
import com.cloud_pricer.web.routes.ApiRoutes;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping(ApiRoutes.Cost.BASE)
@RequiredArgsConstructor
public class CostController {

  private final CostRecordService costRecordService;
  private final ForecastService forecastService;
  private final TenantValidator tenantValidator;
  private final AuditService auditService;

  @GetMapping
  public ResponseEntity<Page<CostRecordResponse>> getAll(@PageableDefault(size = 10) Pageable pageable) {
    UserContext.requirePermission("COST_READ");
    List<CostRecordResponse> list = costRecordService.getByTenantId(UserContext.getTenantId()).stream().map(this::map).toList();
    int start = (int) pageable.getOffset();
    int end = Math.min(start + pageable.getPageSize(), list.size());
    List<CostRecordResponse> content = start < list.size() ? list.subList(start, end) : List.of();
    return ResponseEntity.ok(new PageImpl<>(content, pageable, list.size()));
  }

  @GetMapping("/{id}")
  public ResponseEntity<CostRecordResponse> getById(@PathVariable UUID id) {
    UserContext.requirePermission("COST_READ");
    CostRecord record = costRecordService.getById(id);
    List<CostBreakdown> breakdowns = costRecordService.getBreakdowns(id);
    return ResponseEntity.ok(mapWithBreakdowns(record, breakdowns));
  }

  @PostMapping
  public ResponseEntity<CostRecordResponse> create(@Valid @RequestBody CostRecordRequest dto) {
    UserContext.requirePermission("COST_MANAGE");
    tenantValidator.validateServiceEnvironment(dto.serviceEnvironmentId());
    CostRecord record = new CostRecord();
    record.setTenantId(UserContext.getTenantId());
    record.setServiceEnvironmentId(dto.serviceEnvironmentId());
    record.setPeriodStart(dto.periodStart());
    record.setPeriodEnd(dto.periodEnd());
    record.setMode(dto.mode());
    record.setComputeCost(dto.computeCost());
    record.setStorageCost(dto.storageCost());
    record.setNetworkCost(dto.networkCost());
    record.setBackupCost(dto.backupCost());
    record.setOsCost(dto.osCost());

    List<CostBreakdown> breakdowns = List.of();
    if (dto.breakdowns() != null) {
      breakdowns = dto.breakdowns().stream().map(this::mapBreakdown).toList();
    }

    CostRecord created = costRecordService.create(record, breakdowns);
    List<CostBreakdown> savedBreakdowns = costRecordService.getBreakdowns(created.getId());
    auditService.record("COST_CREATE", "cost-record", created.getId().toString(),
        "Cost record created (serviceEnvironmentId=" + created.getServiceEnvironmentId() + ", total=" + created.getTotalCost() + ")");
    return ResponseEntity.status(HttpStatus.CREATED).body(mapWithBreakdowns(created, savedBreakdowns));
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> delete(@PathVariable UUID id) {
    UserContext.requirePermission("COST_MANAGE");
    costRecordService.delete(id);
    auditService.record("COST_DELETE", "cost-record", id.toString(), "Cost record deleted (id=" + id + ")");
    return ResponseEntity.noContent().build();
  }

  @GetMapping("/forecast")
  public ResponseEntity<ForecastResponse> generateForecast(
      @RequestParam UUID serviceEnvironmentId,
      @RequestParam String period) {
    UserContext.requirePermission("FORECAST_READ");
    CostForecast forecast = forecastService.generateForecast(UserContext.getTenantId(), serviceEnvironmentId, period);
    return ResponseEntity.ok(mapForecast(forecast));
  }

  @GetMapping("/forecast/list")
  public ResponseEntity<List<ForecastResponse>> listForecasts() {
    UserContext.requirePermission("FORECAST_READ");
    return ResponseEntity.ok(
        forecastService.getByTenantId(UserContext.getTenantId()).stream().map(this::mapForecast).toList());
  }

  @GetMapping("/aggregate/tenant")
  public ResponseEntity<List<CostAggregateResponse>> aggregateByTenant() {
    UserContext.requirePermission("COST_READ");
    return ResponseEntity.ok(costRecordService.aggregateByTenant(UserContext.getTenantId()).stream()
        .map(this::mapAggregate).toList());
  }

  @GetMapping("/aggregate/service-environment")
  public ResponseEntity<List<CostAggregateResponse>> aggregateByServiceEnvironment() {
    UserContext.requirePermission("COST_READ");
    return ResponseEntity.ok(costRecordService.aggregateByServiceEnvironmentForTenant(UserContext.getTenantId()).stream()
        .map(this::mapAggregate).toList());
  }

  @GetMapping("/aggregate/period")
  public ResponseEntity<List<CostAggregateResponse>> aggregateByPeriod() {
    UserContext.requirePermission("COST_READ");
    return ResponseEntity.ok(costRecordService.aggregateByPeriodForTenant(UserContext.getTenantId()).stream()
        .map(this::mapAggregate).toList());
  }

  @GetMapping("/aggregate/period/{tenantId}")
  public ResponseEntity<List<CostAggregateResponse>> aggregateByPeriodForTenant() {
    UserContext.requirePermission("COST_READ");
    return ResponseEntity.ok(costRecordService.aggregateByPeriodForTenant(UserContext.getTenantId()).stream()
        .map(this::mapAggregate).toList());
  }

  @GetMapping("/aggregate/service-environment/{tenantId}")
  public ResponseEntity<List<CostAggregateResponse>> aggregateByServiceEnvironmentForTenant() {
    UserContext.requirePermission("COST_READ");
    return ResponseEntity.ok(costRecordService.aggregateByServiceEnvironmentForTenant(UserContext.getTenantId()).stream()
        .map(this::mapAggregate).toList());
  }

  private CostRecordResponse map(CostRecord record) {
    List<CostBreakdown> breakdowns = costRecordService.getBreakdowns(record.getId());
    return mapWithBreakdowns(record, breakdowns);
  }

  private CostRecordResponse mapWithBreakdowns(CostRecord record, List<CostBreakdown> breakdowns) {
    return new CostRecordResponse(
        record.getId(),
        record.getTenantId(),
        record.getServiceEnvironmentId(),
        record.getPeriodStart(),
        record.getPeriodEnd(),
        record.getMode(),
        record.getComputeCost(),
        record.getStorageCost(),
        record.getNetworkCost(),
        record.getBackupCost(),
        record.getOsCost(),
        record.getTotalCost(),
        breakdowns.stream().map(this::mapBreakdownResponse).toList(),
        record.getCreatedAt(),
        record.getUpdatedAt());
  }

  private CostBreakdownResponse mapBreakdownResponse(CostBreakdown bd) {
    return new CostBreakdownResponse(
        bd.getId(),
        bd.getCostRecordId(),
        bd.getType(),
        bd.getUnitCost(),
        bd.getQuantity(),
        bd.getTotal(),
        bd.getCreatedAt());
  }

  private CostBreakdown mapBreakdown(CostBreakdownRequest dto) {
    CostBreakdown bd = new CostBreakdown();
    bd.setType(dto.type());
    bd.setUnitCost(dto.unitCost());
    bd.setQuantity(dto.quantity());
    return bd;
  }

  private ForecastResponse mapForecast(CostForecast forecast) {
    return new ForecastResponse(
        forecast.getId(),
        forecast.getTenantId(),
        forecast.getServiceEnvironmentId(),
        forecast.getPeriod(),
        forecast.getPredictedCost(),
        forecast.getConfidenceLevel(),
        forecast.getCreatedAt());
  }

  private CostAggregateResponse mapAggregate(Object[] row) {
    String groupKey = row[0] != null ? row[0].toString() : "unknown";
    return new CostAggregateResponse(
        groupKey,
        ((Number) row[1]).doubleValue(),
        ((Number) row[2]).doubleValue(),
        ((Number) row[3]).doubleValue(),
        ((Number) row[4]).doubleValue(),
        ((Number) row[5]).doubleValue(),
        ((Number) row[6]).doubleValue(),
        ((Number) row[7]).longValue());
  }
}
