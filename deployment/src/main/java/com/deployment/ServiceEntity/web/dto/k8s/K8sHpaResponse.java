package com.deployment.ServiceEntity.web.dto.k8s;

import java.util.Map;

public record K8sHpaResponse(
    String name,
    String namespace,
    String kind,
    String apiVersion,
    int minReplicas,
    int maxReplicas,
    int currentReplicas,
    int desiredReplicas,
    Integer cpuTargetAverageUtilization,
    Integer cpuCurrentAverageUtilization,
    Integer memoryTargetAverageUtilization,
    Integer memoryCurrentAverageUtilization,
    String status) {

    public static K8sHpaResponse fromK8sJson(Map<String, Object> json) {
        if (json == null || json.isEmpty()) return null;

        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> spec = (Map<String, Object>) json.get("spec");
            @SuppressWarnings("unchecked")
            Map<String, Object> statusMap = (Map<String, Object>) json.get("status");

            int minReplicas = 1;
            int maxReplicas = 10;
            if (spec != null) {
                minReplicas = (int) spec.getOrDefault("minReplicas", 1);
                maxReplicas = (int) spec.getOrDefault("maxReplicas", 10);
            }

            int currentReplicas = 0;
            int desiredReplicas = 0;
            if (statusMap != null) {
                currentReplicas = (int) statusMap.getOrDefault("currentReplicas", 0);
                desiredReplicas = (int) statusMap.getOrDefault("desiredReplicas", 0);
            }

            Integer cpuTarget = null, cpuCurrent = null;
            Integer memTarget = null, memCurrent = null;

            if (spec != null) {
                Object metrics = spec.get("metrics");
                if (metrics instanceof java.util.List) {
                    for (Object m : (java.util.List<?>) metrics) {
                        if (m instanceof Map) {
                            @SuppressWarnings("unchecked")
                            Map<String, Object> metricMap = (Map<String, Object>) m;
                            String type = (String) metricMap.get("type");
                            if ("Resource".equals(type)) {
                                @SuppressWarnings("unchecked")
                                Map<String, Object> resource = (Map<String, Object>) metricMap.get("resource");
                                if (resource != null) {
                                    String name = (String) resource.get("name");
                                    @SuppressWarnings("unchecked")
                                    Map<String, Object> target = (Map<String, Object>) resource.get("target");
                                    if (target != null && "Utilization".equals(target.get("type"))) {
                                        int val = ((Number) target.getOrDefault("averageUtilization", 0)).intValue();
                                        if ("cpu".equals(name)) cpuTarget = val;
                                        else if ("memory".equals(name)) memTarget = val;
                                    }
                                }
                            }
                        }
                    }
                }
            }

            if (statusMap != null) {
                Object currentMetrics = statusMap.get("currentMetrics");
                if (currentMetrics instanceof java.util.List) {
                    for (Object m : (java.util.List<?>) currentMetrics) {
                        if (m instanceof Map) {
                            @SuppressWarnings("unchecked")
                            Map<String, Object> metricMap = (Map<String, Object>) m;
                            String type = (String) metricMap.get("type");
                            if ("Resource".equals(type)) {
                                @SuppressWarnings("unchecked")
                                Map<String, Object> resource = (Map<String, Object>) metricMap.get("resource");
                                if (resource != null) {
                                    String name = (String) resource.get("name");
                                    @SuppressWarnings("unchecked")
                                    Map<String, Object> current = (Map<String, Object>) resource.get("current");
                                    if (current != null && "Utilization".equals(current.get("averageUtilization"))) {
                                        int val = ((Number) current.getOrDefault("averageUtilization", 0)).intValue();
                                        if ("cpu".equals(name)) cpuCurrent = val;
                                        else if ("memory".equals(name)) memCurrent = val;
                                    }
                                }
                            }
                        }
                    }
                }
            }

            String status = "Unknown";
            if (statusMap != null) {
                Object conditions = statusMap.get("conditions");
                if (conditions instanceof java.util.List) {
                    for (Object c : (java.util.List<?>) conditions) {
                        if (c instanceof Map) {
                            @SuppressWarnings("unchecked")
                            Map<String, Object> cond = (Map<String, Object>) c;
                            if ("AbleToScale".equals(cond.get("type")) && Boolean.TRUE.equals(cond.get("status"))) {
                                status = "Active";
                            }
                        }
                    }
                }
            }

            return new K8sHpaResponse(
                (String) json.getOrDefault("name", "unknown"),
                (String) json.getOrDefault("namespace", "default"),
                (String) json.getOrDefault("kind", "HorizontalPodAutoscaler"),
                (String) json.getOrDefault("apiVersion", "autoscaling/v2"),
                minReplicas, maxReplicas, currentReplicas, desiredReplicas,
                cpuTarget, cpuCurrent, memTarget, memCurrent, status);
        } catch (Exception e) {
            return null;
        }
    }

    public static K8sHpaResponse fromSimulated(String name, String namespace, int minReplicas, int maxReplicas, int cpuTarget, int memTarget) {
        return new K8sHpaResponse(name + "-hpa", namespace, "HorizontalPodAutoscaler", "autoscaling/v2",
            minReplicas, maxReplicas, 1, 1, cpuTarget, 30, memTarget, 45, "Active");
    }
}
