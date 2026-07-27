package com.deployment.ServiceEntity.web.controller;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.deployment.ServiceEntity.config.UserContext;
import com.deployment.ServiceEntity.domain.Metric;
import com.deployment.ServiceEntity.service.MetricService;
import com.deployment.ServiceEntity.web.dto.metric.MetricCreateDto;
import com.deployment.ServiceEntity.web.dto.metric.MetricSummaryDto;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/metrics")
@RequiredArgsConstructor
public class MetricController {

    private final MetricService metricService;

    @PostMapping
    public ResponseEntity<Map<String, Object>> create(@Valid @RequestBody MetricCreateDto dto) {
        UserContext.requirePermission("METRIC_MANAGE");
        Metric metric = new Metric();
        metric.setCpuUsage(dto.cpuUsage().floatValue());
        metric.setRamUsage(dto.ramUsage().floatValue());
        metric.setNetworkUsage(dto.networkUsage().floatValue());
        metric.setDiskUsage(dto.diskUsage().floatValue());
        metric.setPods(dto.pods());
        metric.setServiceEnvironmentId(dto.serviceEnvironmentId());
        metric.setTimestamp(dto.timestamp());

        Metric created = metricService.create(metric);
        return ResponseEntity.status(HttpStatus.CREATED).body(map(created));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> update(
            @PathVariable UUID id, @Valid @RequestBody MetricCreateDto dto) {
        UserContext.requirePermission("METRIC_MANAGE");
        Metric metric = new Metric();
        metric.setCpuUsage(dto.cpuUsage().floatValue());
        metric.setRamUsage(dto.ramUsage().floatValue());
        metric.setNetworkUsage(dto.networkUsage().floatValue());
        metric.setDiskUsage(dto.diskUsage().floatValue());
        metric.setPods(dto.pods());
        metric.setServiceEnvironmentId(dto.serviceEnvironmentId());
        metric.setTimestamp(dto.timestamp());

        return ResponseEntity.ok(map(metricService.update(id, metric)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getById(@PathVariable UUID id) {
        UserContext.requirePermission("METRIC_READ");
        return ResponseEntity.ok(map(metricService.getById(id)));
    }

    @GetMapping
    public ResponseEntity<Page<Map<String, Object>>> getAll(
            @RequestParam(required = false) UUID serviceEnvironmentId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        UserContext.requirePermission("METRIC_READ");
        Page<Metric> metrics = metricService.getAll(
                serviceEnvironmentId,
                from,
                to,
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "timestamp")));
        return ResponseEntity.ok(metrics.map(this::map));
    }

    @GetMapping("/latest/{serviceEnvId}")
    public ResponseEntity<Map<String, Object>> getLatest(@PathVariable UUID serviceEnvId) {
        UserContext.requirePermission("METRIC_READ");
        Metric latest = metricService.getLatest(serviceEnvId);
        return ResponseEntity.ok(map(latest));
    }

    @GetMapping("/service-environment/{id}")
    public ResponseEntity<List<Map<String, Object>>> getMetricsByServiceEnvironment(
            @PathVariable UUID id) {
        UserContext.requirePermission("METRIC_READ");
        List<Metric> metrics = metricService.getMetricsByServiceEnvironment(id);
        return ResponseEntity.ok(metrics.stream().map(this::map).toList());
    }

    @GetMapping("/summary/{id}")
    public ResponseEntity<MetricSummaryDto> getSummary(@PathVariable UUID id) {
        UserContext.requirePermission("METRIC_READ");
        return ResponseEntity.ok(metricService.getSummary(id));
    }

    private Map<String, Object> map(Metric metric) {
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("id", metric.getId());
        response.put("cpuUsage", metric.getCpuUsage());
        response.put("ramUsage", metric.getRamUsage());
        response.put("networkUsage", metric.getNetworkUsage());
        response.put("diskUsage", metric.getDiskUsage());
        response.put("pods", metric.getPods());
        response.put("serviceEnvironmentId", metric.getServiceEnvironmentId());
        response.put("timestamp", metric.getTimestamp());
        response.put("createdAt", metric.getCreatedAt());
        response.put("updatedAt", metric.getUpdatedAt());
        return response;
    }

}
