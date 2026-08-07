package com.cloud_pricer.web.controller;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;

import com.cloud_pricer.config.UserContext;
import com.cloud_pricer.service.AuditService;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.cloud_pricer.domain.CostBreakdown;
import com.cloud_pricer.domain.CostForecast;
import com.cloud_pricer.domain.CostRecord;
import com.cloud_pricer.service.CostAutoGeneratorService;
import com.cloud_pricer.service.CostRecordService;
import com.cloud_pricer.service.ForecastService;
import com.cloud_pricer.web.dto.cost.CostAggregateResponse;
import com.cloud_pricer.web.dto.cost.CostBreakdownResponse;
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
    private final CostAutoGeneratorService costAutoGeneratorService;
    private final AuditService auditService;

    @PostMapping("/generate")
    public ResponseEntity<Map<String, Object>> generateNow() {
        UserContext.requirePermission("COST_MANAGE");
        costAutoGeneratorService.autoGenerateCosts();
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", "ok");
        body.put("message", "Cost auto-generation triggered");
        return ResponseEntity.ok(body);
    }

    @GetMapping
    public ResponseEntity<Page<CostRecordResponse>> getAll(@PageableDefault(size = 10) Pageable pageable) {
        UserContext.requirePermission("COST_READ");
        Page<CostRecord> page = costRecordService.getPageByTenantId(UserContext.getTenantId(), pageable);
        return ResponseEntity.ok(page.map(this::map));
    }

    @GetMapping("/{id}")
    public ResponseEntity<CostRecordResponse> getById(@PathVariable UUID id) {
        UserContext.requirePermission("COST_READ");
        CostRecord record = costRecordService.getById(id);
        List<CostBreakdown> breakdowns = costRecordService.getBreakdowns(id);
        return ResponseEntity.ok(mapWithBreakdowns(record, breakdowns));
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
