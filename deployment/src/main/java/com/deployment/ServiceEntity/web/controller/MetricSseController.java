package com.deployment.ServiceEntity.web.controller;

import java.io.IOException;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import com.deployment.ServiceEntity.config.UserContext;
import com.deployment.ServiceEntity.domain.Metric;
import com.deployment.ServiceEntity.repository.MetricRepository;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/metrics")
@RequiredArgsConstructor
public class MetricSseController {

    private final MetricRepository metricRepository;

    private final Map<SseEmitter, UUID> emitters = new ConcurrentHashMap<>();
    private final Map<SseEmitter, UUID> lastSentIds = new ConcurrentHashMap<>();

    @GetMapping(value = "/stream/{serviceEnvironmentId}", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter subscribe(@PathVariable UUID serviceEnvironmentId) {
        UserContext.requirePermission("METRIC_READ");
        SseEmitter emitter = new SseEmitter(-1L);

        emitter.onCompletion(() -> { emitters.remove(emitter); lastSentIds.remove(emitter); });
        emitter.onTimeout(() -> { emitters.remove(emitter); lastSentIds.remove(emitter); });
        emitter.onError(e -> { emitters.remove(emitter); lastSentIds.remove(emitter); });

        emitters.put(emitter, serviceEnvironmentId);

        Metric latest = metricRepository.findTopByServiceEnvironmentIdOrderByCreatedAtDesc(serviceEnvironmentId)
                .orElse(null);
        if (latest != null) {
            try {
                emitter.send(SseEmitter.event()
                        .name("metric")
                        .data(Map.of(
                                "cpuUsage", latest.getCpuUsage(),
                                "ramUsage", latest.getRamUsage(),
                                "diskUsage", latest.getDiskUsage(),
                                "networkUsage", latest.getNetworkUsage(),
                                "pods", latest.getPods(),
                                "timestamp", Instant.now().toString())));
                lastSentIds.put(emitter, latest.getId());
            } catch (IOException e) {
                emitters.remove(emitter);
                lastSentIds.remove(emitter);
            }
        }

        return emitter;
    }

    @Scheduled(fixedRate = 5000)
    public void pushMetrics() {
        Map<SseEmitter, UUID> dead = new java.util.HashMap<>();
        for (Map.Entry<SseEmitter, UUID> entry : emitters.entrySet()) {
            SseEmitter emitter = entry.getKey();
            UUID serviceEnvironmentId = entry.getValue();
            try {
                Metric latest = metricRepository.findTopByServiceEnvironmentIdOrderByCreatedAtDesc(serviceEnvironmentId)
                        .orElse(null);
                if (latest == null) {
                    continue;
                }
                UUID lastSentId = lastSentIds.get(emitter);
                if (lastSentId != null && lastSentId.equals(latest.getId())) {
                    continue;
                }
                emitter.send(SseEmitter.event()
                        .name("metric")
                        .data(Map.of(
                                "cpuUsage", latest.getCpuUsage(),
                                "ramUsage", latest.getRamUsage(),
                                "diskUsage", latest.getDiskUsage(),
                                "networkUsage", latest.getNetworkUsage(),
                                "pods", latest.getPods(),
                                "timestamp", Instant.now().toString())));
                lastSentIds.put(emitter, latest.getId());
            } catch (IOException e) {
                dead.put(emitter, serviceEnvironmentId);
            }
        }
        dead.keySet().forEach(emitter -> { emitters.remove(emitter); lastSentIds.remove(emitter); });
    }
}
