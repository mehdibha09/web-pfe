package com.deployment.ServiceEntity.web.dto.k8s;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

public record K8sRoleResponse(
    String name,
    String namespace,
    boolean isClusterRole,
    List<String> rulesSummary,
    int rulesCount,
    String createdAt,
    String apiVersion) {

    @SuppressWarnings("unchecked")
    public static K8sRoleResponse fromK8sJson(Map<String, Object> json, boolean isClusterRole) {
        if (json == null) return null;
        try {
            Map<String, Object> metadata = (Map<String, Object>) json.get("metadata");
            if (metadata == null) return null;

            String name = (String) metadata.get("name");
            String namespace = isClusterRole ? "" : (String) metadata.get("namespace");
            String creationTimestamp = (String) metadata.get("creationTimestamp");

            List<Map<String, Object>> rules = (List<Map<String, Object>>) json.get("rules");
            int rulesCount = rules != null ? rules.size() : 0;
            List<String> rulesSummary = rules != null
                ? rules.stream().map(r -> {
                    List<String> resources = (List<String>) r.get("resources");
                    List<String> verbs = (List<String>) r.get("verbs");
                    String resStr = resources != null ? String.join(",", resources) : "*";
                    String verbStr = verbs != null ? String.join(",", verbs) : "*";
                    return resStr + " → " + verbStr;
                }).collect(Collectors.toList())
                : List.of();

            return new K8sRoleResponse(name, namespace != null ? namespace : "", isClusterRole,
                rulesSummary, rulesCount, creationTimestamp,
                isClusterRole ? "rbac.authorization.k8s.io/v1" : "rbac.authorization.k8s.io/v1");
        } catch (Exception e) {
            return null;
        }
    }

    @SuppressWarnings("unchecked")
    public static List<K8sRoleResponse> fromK8sList(Map<String, Object> json, boolean isClusterRole) {
        if (json == null) return List.of();
        try {
            List<Map<String, Object>> items = (List<Map<String, Object>>) json.get("items");
            if (items == null) return List.of();
            return items.stream()
                .map(item -> fromK8sJson(item, isClusterRole))
                .filter(r -> r != null)
                .toList();
        } catch (Exception e) {
            return List.of();
        }
    }

    public static K8sRoleResponse fromSimulated(String name, String namespace, boolean isClusterRole) {
        return new K8sRoleResponse(name, namespace, isClusterRole, List.of(), 0,
            java.time.Instant.now().toString(), "rbac.authorization.k8s.io/v1");
    }
}
