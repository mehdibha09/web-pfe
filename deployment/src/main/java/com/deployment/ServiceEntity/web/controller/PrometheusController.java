package com.deployment.ServiceEntity.web.controller;

import java.util.LinkedHashMap;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.deployment.ServiceEntity.config.UserContext;
import com.deployment.ServiceEntity.service.PrometheusService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/metrics/prometheus")
@RequiredArgsConstructor
public class PrometheusController {

    private static final Logger log = LoggerFactory.getLogger(PrometheusController.class);

    private final PrometheusService prometheusService;

    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> status() {
        UserContext.requirePermission("METRIC_READ");
        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("reachable", prometheusService.isReachable());
        resp.put("url", prometheusService.getUrl());
        return ResponseEntity.ok(resp);
    }

    @GetMapping("/query")
    public ResponseEntity<Map<String, Object>> instantQuery(@RequestParam String query) {
        UserContext.requirePermission("METRIC_READ");
        log.info("Prometheus instant query by user={} tenant={}: {}", UserContext.getUserId(), UserContext.getTenantId(), query);
        Map<String, Object> data = prometheusService.instantQuery(query);
        return ResponseEntity.ok(data);
    }

    @GetMapping("/range")
    public ResponseEntity<Map<String, Object>> rangeQuery(
            @RequestParam String query,
            @RequestParam String start,
            @RequestParam String end,
            @RequestParam(defaultValue = "15s") String step) {
        UserContext.requirePermission("METRIC_READ");
        log.info("Prometheus range query by user={} tenant={}: {} [{}, {}]", UserContext.getUserId(), UserContext.getTenantId(), query, start, end);
        Map<String, Object> data = prometheusService.rangeQuery(query, start, end, step);
        return ResponseEntity.ok(data);
    }
}
