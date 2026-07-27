package com.deployment.ServiceEntity.web.dto.k8s;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

public record K8sServiceAccountResponse(
    String name,
    String namespace,
    Map<String, String> labels,
    int secretsCount,
    List<String> secretNames,
    String createdAt,
    String apiVersion) {

    @SuppressWarnings("unchecked")
    public static K8sServiceAccountResponse fromK8sJson(Map<String, Object> json) {
        if (json == null) return null;
        try {
            Map<String, Object> metadata = (Map<String, Object>) json.get("metadata");
            if (metadata == null) return null;

            String name = (String) metadata.get("name");
            String namespace = (String) metadata.get("namespace");
            String creationTimestamp = (String) metadata.get("creationTimestamp");
            Map<String, Object> rawLabels = (Map<String, Object>) metadata.get("labels");
            Map<String, String> labels = rawLabels != null
                ? rawLabels.entrySet().stream().collect(Collectors.toMap(Map.Entry::getKey, e -> e.getValue().toString()))
                : Map.of();

            List<Map<String, Object>> secrets = (List<Map<String, Object>>) json.get("secrets");
            int secretsCount = secrets != null ? secrets.size() : 0;
            List<String> secretNames = secrets != null
                ? secrets.stream().map(s -> (String) s.get("name")).collect(Collectors.toList())
                : List.of();

            return new K8sServiceAccountResponse(name, namespace != null ? namespace : "default",
                labels, secretsCount, secretNames, creationTimestamp, "v1");
        } catch (Exception e) {
            return null;
        }
    }

    @SuppressWarnings("unchecked")
    public static List<K8sServiceAccountResponse> fromK8sList(Map<String, Object> json) {
        if (json == null) return List.of();
        try {
            List<Map<String, Object>> items = (List<Map<String, Object>>) json.get("items");
            if (items == null) return List.of();
            return items.stream()
                .map(K8sServiceAccountResponse::fromK8sJson)
                .filter(r -> r != null)
                .toList();
        } catch (Exception e) {
            return List.of();
        }
    }

    public static K8sServiceAccountResponse fromSimulated(String name, String namespace) {
        return new K8sServiceAccountResponse(name, namespace, Map.of(), 0, List.of(),
            java.time.Instant.now().toString(), "v1");
    }
}
