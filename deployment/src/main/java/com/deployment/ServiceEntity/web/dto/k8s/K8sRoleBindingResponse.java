package com.deployment.ServiceEntity.web.dto.k8s;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

public record K8sRoleBindingResponse(
    String name,
    String namespace,
    boolean isClusterBinding,
    String roleRefKind,
    String roleRefName,
    List<String> subjectsSummary,
    String createdAt,
    String apiVersion) {

    @SuppressWarnings("unchecked")
    public static K8sRoleBindingResponse fromK8sJson(Map<String, Object> json, boolean isClusterBinding) {
        if (json == null) return null;
        try {
            Map<String, Object> metadata = (Map<String, Object>) json.get("metadata");
            if (metadata == null) return null;

            String name = (String) metadata.get("name");
            String namespace = isClusterBinding ? "" : (String) metadata.get("namespace");
            String creationTimestamp = (String) metadata.get("creationTimestamp");

            Map<String, Object> roleRef = (Map<String, Object>) json.get("roleRef");
            String roleRefKind = roleRef != null ? (String) roleRef.get("kind") : "";
            String roleRefName = roleRef != null ? (String) roleRef.get("name") : "";

            List<Map<String, Object>> subjects = (List<Map<String, Object>>) json.get("subjects");
            List<String> subjectsSummary = subjects != null
                ? subjects.stream().map(s -> {
                    String kind = (String) s.get("kind");
                    String sName = (String) s.get("name");
                    String sNs = (String) s.get("namespace");
                    return (kind != null ? kind : "User") + "/" + sName + (sNs != null ? " (ns:" + sNs + ")" : "");
                }).collect(Collectors.toList())
                : List.of();

            String apiVersion = isClusterBinding ? "rbac.authorization.k8s.io/v1" : "rbac.authorization.k8s.io/v1";
            return new K8sRoleBindingResponse(name, namespace != null ? namespace : "",
                isClusterBinding, roleRefKind, roleRefName, subjectsSummary,
                creationTimestamp, apiVersion);
        } catch (Exception e) {
            return null;
        }
    }

    @SuppressWarnings("unchecked")
    public static List<K8sRoleBindingResponse> fromK8sList(Map<String, Object> json, boolean isClusterBinding) {
        if (json == null) return List.of();
        try {
            List<Map<String, Object>> items = (List<Map<String, Object>>) json.get("items");
            if (items == null) return List.of();
            return items.stream()
                .map(item -> fromK8sJson(item, isClusterBinding))
                .filter(r -> r != null)
                .toList();
        } catch (Exception e) {
            return List.of();
        }
    }

    public static K8sRoleBindingResponse fromSimulated(String name, String namespace, boolean isClusterBinding,
            String roleKind, String roleName) {
        return new K8sRoleBindingResponse(name, namespace, isClusterBinding, roleKind, roleName,
            List.of(), java.time.Instant.now().toString(), "rbac.authorization.k8s.io/v1");
    }
}
