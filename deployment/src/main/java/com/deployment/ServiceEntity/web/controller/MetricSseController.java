package com.deployment.ServiceEntity.web.controller;

import java.io.IOException;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.beans.factory.annotation.Value;
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

    @Value("${metrics.sse.push-interval-ms:3000}")
    private long pushIntervalMs;

    @Value("${metrics.sse.heartbeat-ms:3000}")
    private long heartbeatMs;

    @Value("${metrics.sse.timeout-ms:0}")
    private long timeoutMs;

    private final Map<SseEmitter, UUID> emitters = new ConcurrentHashMap<>();
    private final Map<SseEmitter, UUID> lastSentIds = new ConcurrentHashMap<>();
    private final Map<SseEmitter, Instant> lastHeartbeat = new ConcurrentHashMap<>();

    @GetMapping(value = "/stream/{serviceEnvironmentId}", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter subscribe(@PathVariable UUID serviceEnvironmentId) {
        UserContext.requirePermission("METRIC_READ");
        SseEmitter emitter = new SseEmitter(timeoutMs > 0 ? timeoutMs : -1L);

        emitter.onCompletion(() -> { emitters.remove(emitter); lastSentIds.remove(emitter); lastHeartbeat.remove(emitter); });
        emitter.onTimeout(() -> { emitters.remove(emitter); lastSentIds.remove(emitter); lastHeartbeat.remove(emitter); });
        emitter.onError(e -> { emitters.remove(emitter); lastSentIds.remove(emitter); lastHeartbeat.remove(emitter); });

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
                lastHeartbeat.remove(emitter);
            }
        }

        return emitter;
    }

    @Scheduled(fixedRateString = "${metrics.sse.push-interval-ms:3000}")
    public void pushMetrics() {
        Map<SseEmitter, UUID> dead = new java.util.HashMap<>();
        for (Map.Entry<SseEmitter, UUID> entry : emitters.entrySet()) {
            SseEmitter emitter = entry.getKey();
            UUID serviceEnvironmentId = entry.getValue();
            try {
                Metric latest = metricRepository.findTopByServiceEnvironmentIdOrderByCreatedAtDesc(serviceEnvironmentId)
                        .orElse(null);
                if (latest == null) {
                    sendHeartbeat(emitter);
                    continue;
                }
                UUID lastSentId = lastSentIds.get(emitter);
                if (lastSentId != null && lastSentId.equals(latest.getId())) {
                    sendHeartbeat(emitter);
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
                lastHeartbeat.put(emitter, Instant.now());
            } catch (IOException e) {
                dead.put(emitter, serviceEnvironmentId);
            }
        }
        dead.keySet().forEach(emitter -> { emitters.remove(emitter); lastSentIds.remove(emitter); lastHeartbeat.remove(emitter); });
    }

    private void sendHeartbeat(SseEmitter emitter) {
        try {
            Instant last = lastHeartbeat.get(emitter);
            if (last == null || Instant.now().isAfter(last.plusMillis(heartbeatMs))) {
                emitter.send(SseEmitter.event().comment("ping"));
                lastHeartbeat.put(emitter, Instant.now());
            }
        } catch (IOException e) {
            // dead emitter handled by caller loop
        }
    }
}
