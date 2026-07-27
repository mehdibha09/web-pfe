package com.deployment.ServiceEntity.web.dto.k8s;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public record K8sConfigMapResponse(
    String name,
    String namespace,
    Map<String, String> data,
    Map<String, String> binaryData,
    Map<String, String> labels,
    int dataEntries,
    String createdAt,
    String apiVersion) {

    @SuppressWarnings("unchecked")
    public static K8sConfigMapResponse fromK8sJson(Map<String, Object> json) {
        if (json == null) return null;
        try {
            Map<String, Object> metadata = (Map<String, Object>) json.get("metadata");
            if (metadata == null) return null;

            String name = (String) metadata.get("name");
            String namespace = (String) metadata.get("namespace");
            String creationTimestamp = (String) metadata.get("creationTimestamp");

            Map<String, String> data = (Map<String, String>) json.get("data");
            Map<String, String> binaryData = (Map<String, String>) json.get("binaryData");
            Map<String, Object> rawLabels = (Map<String, Object>) metadata.get("labels");
            Map<String, String> labels = new LinkedHashMap<>();
            if (rawLabels != null) {
                rawLabels.forEach((k, v) -> labels.put(k, v != null ? v.toString() : ""));
            }

            int dataEntries = (data != null ? data.size() : 0) + (binaryData != null ? binaryData.size() : 0);

            return new K8sConfigMapResponse(name, namespace != null ? namespace : "default",
                data != null ? data : Map.of(),
                binaryData != null ? binaryData : Map.of(),
                labels, dataEntries, creationTimestamp, "v1");
        } catch (Exception e) {
            return null;
        }
    }

    @SuppressWarnings("unchecked")
    public static List<K8sConfigMapResponse> fromK8sList(Map<String, Object> json) {
        if (json == null) return List.of();
        try {
            List<Map<String, Object>> items = (List<Map<String, Object>>) json.get("items");
            if (items == null) return List.of();
            return items.stream()
                .map(K8sConfigMapResponse::fromK8sJson)
                .filter(r -> r != null)
                .toList();
        } catch (Exception e) {
            return List.of();
        }
    }

    public static K8sConfigMapResponse fromSimulated(String name, String namespace, Map<String, String> data) {
        return new K8sConfigMapResponse(name, namespace, data, Map.of(), Map.of(),
            data != null ? data.size() : 0, java.time.Instant.now().toString(), "v1");
    }
}
