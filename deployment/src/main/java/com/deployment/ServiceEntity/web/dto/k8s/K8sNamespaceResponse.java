package com.deployment.ServiceEntity.web.dto.k8s;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

public record K8sNamespaceResponse(
    String name,
    String status,
    Map<String, String> labels,
    String createdAt,
    String apiVersion) {

    @SuppressWarnings("unchecked")
    public static K8sNamespaceResponse fromK8sJson(Map<String, Object> json) {
        if (json == null) return null;
        try {
            Map<String, Object> metadata = (Map<String, Object>) json.get("metadata");
            if (metadata == null) return null;

            String name = (String) metadata.get("name");
            String creationTimestamp = (String) metadata.get("creationTimestamp");

            Map<String, Object> rawLabels = (Map<String, Object>) metadata.get("labels");
            Map<String, String> labels = rawLabels != null
                ? rawLabels.entrySet().stream().collect(Collectors.toMap(Map.Entry::getKey, e -> e.getValue().toString()))
                : Map.of();

            Map<String, Object> status = (Map<String, Object>) json.get("status");
            String phase = status != null ? (String) status.get("phase") : "Active";

            return new K8sNamespaceResponse(name, phase, labels, creationTimestamp, "v1");
        } catch (Exception e) {
            return null;
        }
    }

    @SuppressWarnings("unchecked")
    public static List<K8sNamespaceResponse> fromK8sList(Map<String, Object> json) {
        if (json == null) return List.of();
        try {
            List<Map<String, Object>> items = (List<Map<String, Object>>) json.get("items");
            if (items == null) return List.of();
            return items.stream()
                .map(K8sNamespaceResponse::fromK8sJson)
                .filter(r -> r != null)
                .toList();
        } catch (Exception e) {
            return List.of();
        }
    }

    public static K8sNamespaceResponse fromSimulated(String name) {
        return new K8sNamespaceResponse(name, "Active", Map.of(),
            java.time.Instant.now().toString(), "v1");
    }
}