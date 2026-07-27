package com.deployment.ServiceEntity.web.dto.k8s;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

public record K8sSecretResponse(
    String name,
    String namespace,
    String type,
    List<String> dataKeys,
    int dataEntries,
    Map<String, String> labels,
    String createdAt,
    String apiVersion) {

    @SuppressWarnings("unchecked")
    public static K8sSecretResponse fromK8sJson(Map<String, Object> json) {
        if (json == null) return null;
        try {
            Map<String, Object> metadata = (Map<String, Object>) json.get("metadata");
            if (metadata == null) return null;

            String name = (String) metadata.get("name");
            String namespace = (String) metadata.get("namespace");
            String creationTimestamp = (String) metadata.get("creationTimestamp");
            String type = (String) json.get("type");
            if (type == null) type = "Opaque";

            Map<String, Object> rawData = (Map<String, Object>) json.get("data");
            List<String> dataKeys = rawData != null
                ? rawData.keySet().stream().sorted().collect(Collectors.toList())
                : List.of();
            int dataEntries = rawData != null ? rawData.size() : 0;

            Map<String, Object> rawLabels = (Map<String, Object>) metadata.get("labels");
            Map<String, String> labels = rawLabels != null
                ? rawLabels.entrySet().stream().collect(Collectors.toMap(Map.Entry::getKey, e -> e.getValue().toString()))
                : Map.of();

            return new K8sSecretResponse(name, namespace != null ? namespace : "default",
                type, dataKeys, dataEntries, labels, creationTimestamp, "v1");
        } catch (Exception e) {
            return null;
        }
    }

    @SuppressWarnings("unchecked")
    public static List<K8sSecretResponse> fromK8sList(Map<String, Object> json) {
        if (json == null) return List.of();
        try {
            List<Map<String, Object>> items = (List<Map<String, Object>>) json.get("items");
            if (items == null) return List.of();
            return items.stream()
                .map(K8sSecretResponse::fromK8sJson)
                .filter(r -> r != null)
                .toList();
        } catch (Exception e) {
            return List.of();
        }
    }

    public static K8sSecretResponse fromSimulated(String name, String namespace, String type) {
        return new K8sSecretResponse(name, namespace, type != null ? type : "Opaque",
            List.of(), 0, Map.of(), java.time.Instant.now().toString(), "v1");
    }
}
