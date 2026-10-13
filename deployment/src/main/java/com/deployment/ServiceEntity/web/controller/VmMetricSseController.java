package com.deployment.ServiceEntity.web.controller;

import java.io.IOException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
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
import com.deployment.ServiceEntity.infra.VmClient;
import com.deployment.ServiceEntity.domain.Vm;
import com.deployment.ServiceEntity.repository.VmRepository;
import com.deployment.ServiceEntity.web.dto.vm.VmMetricsSnapshot;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/vms")
@RequiredArgsConstructor
public class VmMetricSseController {

    private final VmRepository vmRepository;
    private final VmClient vagrantClient;

    private final ConcurrentHashMap<UUID, List<SseEmitter>> emittersMap = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<SseEmitter, Instant> lastHeartbeat = new ConcurrentHashMap<>();

    private static final long HEARTBEAT_MS = 5000L;

    @GetMapping(value = "/{id}/metrics/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter subscribe(@PathVariable UUID id) {
        UserContext.requirePermission("METRIC_READ");
        // Scoping tenant : on n'abonne que si la VM appartient au tenant courant
        // (même règle que les endpoints GET /vms/{id}/metrics non-SSE).
        Vm ownedVm = vmRepository.findById(id)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "VM not found"));
        if (!ownedVm.getTenantId().equals(UserContext.getTenantId())) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.NOT_FOUND, "VM not found");
        }
        SseEmitter emitter = new SseEmitter(-1L);

        emitter.onCompletion(() -> removeEmitter(id, emitter));
        emitter.onTimeout(() -> removeEmitter(id, emitter));
        emitter.onError(e -> removeEmitter(id, emitter));

        emittersMap.computeIfAbsent(id, k -> new java.util.concurrent.CopyOnWriteArrayList<>()).add(emitter);

        return emitter;
    }

    @Scheduled(fixedRate = 5000)
    public void pushMetrics() {
        for (Map.Entry<UUID, List<SseEmitter>> entry : emittersMap.entrySet()) {
            UUID vmId = entry.getKey();
            List<SseEmitter> emitters = entry.getValue();

            if (emitters.isEmpty()) {
                continue;
            }

            Vm vm = vmRepository.findById(vmId).orElse(null);

            VmMetricsSnapshot snapshot = null;
            if (vm != null && vm.getStatus() == Vm.Status.RUNNING && vm.getVboxName() != null) {
                try {
                    snapshot = vagrantClient.queryMetrics(vm.getVboxName());
                } catch (Exception e) {
                    snapshot = null;
                }
            }

            // Pas de snapshot disponible : on maintient le flux vivant avec un
            // heartbeat pour éviter les streams silencieux/morts ("client_gone").
            if (snapshot == null) {
                List<SseEmitter> dead = new ArrayList<>();
                for (SseEmitter emitter : emitters) {
                    if (!sendHeartbeat(emitter)) {
                        dead.add(emitter);
                    }
                }
                for (SseEmitter emitter : dead) {
                    removeEmitter(vmId, emitter);
                }
                continue;
            }

            float ramPercent = vm.getRam() > 0
                    ? (float) Math.min(100, Math.max(0, (snapshot.getRamUsageKb() / (vm.getRam() * 1024.0)) * 100.0))
                    : 0f;
            float diskPercent = vm.getDisk() > 0
                    ? (float) Math.min(100, Math.max(0, (snapshot.getDiskUsageMb() / (vm.getDisk() * 1024.0)) * 100.0))
                    : 0f;

            Map<String, Object> data = Map.of(
                    "cpuUsage", snapshot.getCpuUsage(),
                    "ramUsage", ramPercent,
                    "diskUsage", diskPercent,
                    "networkUsage", snapshot.getNetworkRateBps());

            List<SseEmitter> dead = new ArrayList<>();
            for (SseEmitter emitter : emitters) {
                try {
                    emitter.send(SseEmitter.event().name("vm-metric").data(data));
                    lastHeartbeat.put(emitter, Instant.now());
                } catch (IOException e) {
                    dead.add(emitter);
                }
            }
            for (SseEmitter emitter : dead) {
                removeEmitter(vmId, emitter);
            }
        }
    }

    /**
     * Envoie un heartbeat (commentaire SSE) si l'intervalle est dépassé.
     * Retourne false si l'emitter est mort (IOException) et doit être retiré.
     */
    private boolean sendHeartbeat(SseEmitter emitter) {
        try {
            Instant last = lastHeartbeat.get(emitter);
            if (last == null || Instant.now().isAfter(last.plusMillis(HEARTBEAT_MS))) {
                emitter.send(SseEmitter.event().comment("ping"));
                lastHeartbeat.put(emitter, Instant.now());
            }
            return true;
        } catch (IOException e) {
            return false;
        }
    }

    private void removeEmitter(UUID vmId, SseEmitter emitter) {
        lastHeartbeat.remove(emitter);
        List<SseEmitter> list = emittersMap.get(vmId);
        if (list != null) {
            list.remove(emitter);
            if (list.isEmpty()) {
                emittersMap.remove(vmId);
            }
        }
    }
}
