package com.deployment.ServiceEntity.service;

import java.net.http.HttpConnectTimeoutException;
import java.net.http.HttpTimeoutException;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class PrometheusService {

    private final RestTemplate rest;

    @Value("${prometheus.url:http://localhost:9090}")
    private String prometheusUrl;

    private boolean reachable = false;

    public PrometheusService() {
        var factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(3000);
        factory.setReadTimeout(5000);
        this.rest = new RestTemplate(factory);
    }

    @PostConstruct
    public void checkConnection() {
        try {
            ResponseEntity<String> resp = rest.getForEntity(
                    prometheusUrl + "/-/ready", String.class);
            reachable = resp.getStatusCode().is2xxSuccessful();
            if (reachable) {
                log.info("Prometheus reachable at {}", prometheusUrl);
            } else {
                log.warn("Prometheus at {} returned {}", prometheusUrl, resp.getStatusCode());
            }
        } catch (Exception e) {
            reachable = false;
            log.info("Prometheus not reachable at {}: {}", prometheusUrl, e.getMessage());
        }
    }

    public boolean isReachable() {
        return reachable;
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> instantQuery(String query) {
        String url = prometheusUrl + "/api/v1/query?query=" + query;
        try {
            ResponseEntity<Map> resp = rest.getForEntity(url, Map.class);
            if (resp.getBody() != null) {
                return resp.getBody();
            }
        } catch (Exception e) {
            log.warn("Prometheus instant query failed: {}", e.getMessage());
        }
        Map<String, Object> empty = new LinkedHashMap<>();
        empty.put("status", "error");
        empty.put("data", null);
        return empty;
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> rangeQuery(String query, String start, String end, String step) {
        String url = String.format(
                "%s/api/v1/query_range?query=%s&start=%s&end=%s&step=%s",
                prometheusUrl, query, start, end, step);
        try {
            ResponseEntity<Map> resp = rest.getForEntity(url, Map.class);
            if (resp.getBody() != null) {
                return resp.getBody();
            }
        } catch (Exception e) {
            log.warn("Prometheus range query failed: {}", e.getMessage());
        }
        Map<String, Object> empty = new LinkedHashMap<>();
        empty.put("status", "error");
        empty.put("data", null);
        return empty;
    }

    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> getDeploymentMetrics(String deploymentName, String namespace) {
        List<Map<String, Object>> result = new ArrayList<>();

        String cpuQuery = String.format(
                "sum(rate(container_cpu_usage_seconds_total{namespace=\"%s\",pod=~\"%s-.*\"}[5m])) by (pod) * 100",
                namespace, deploymentName);
        String memQuery = String.format(
                "sum(container_memory_working_set_bytes{namespace=\"%s\",pod=~\"%s-.*\"}) by (pod)",
                namespace, deploymentName);

        Map<String, Object> cpuData = instantQuery(cpuQuery);
        Map<String, Object> memData = instantQuery(memQuery);

        Map<String, Object> entry = new LinkedHashMap<>();
        entry.put("cpuResult", cpuData);
        entry.put("memResult", memData);
        result.add(entry);

        return result;
    }

    public String getUrl() {
        return prometheusUrl;
    }
}
