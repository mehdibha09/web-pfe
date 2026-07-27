package com.deployment.ServiceEntity.web.dto.k8s;

import java.util.List;
import java.util.Map;

public record K8sNetworkPolicyResponse(
    String name,
    String namespace,
    String podSelector,
    List<String> policyTypes,
    List<String> ingressRules,
    List<String> egressRules,
    String createdAt,
    String apiVersion) {

    @SuppressWarnings("unchecked")
    public static K8sNetworkPolicyResponse fromK8sJson(Map<String, Object> json) {
        if (json == null) return null;

        try {
            Map<String, Object> metadata = (Map<String, Object>) json.get("metadata");
            Map<String, Object> spec = (Map<String, Object>) json.get("spec");

            String name = metadata != null ? (String) metadata.get("name") : "unknown";
            String namespace = metadata != null ? (String) metadata.get("namespace") : "default";
            String creationTimestamp = metadata != null ? (String) metadata.get("creationTimestamp") : null;

            String podSelector = "";
            if (spec != null) {
                Map<String, Object> ps = (Map<String, Object>) spec.get("podSelector");
                if (ps != null) {
                    Map<String, Object> matchLabels = (Map<String, Object>) ps.get("matchLabels");
                    if (matchLabels != null) podSelector = matchLabels.toString();
                }
            }

            List<String> policyTypes = spec != null ? (List<String>) spec.get("policyTypes") : List.of();
            List<String> ingressSummary = parseRules((List<Map<String, Object>>) (spec != null ? spec.get("ingress") : null), true);
            List<String> egressSummary = parseRules((List<Map<String, Object>>) (spec != null ? spec.get("egress") : null), false);

            return new K8sNetworkPolicyResponse(name, namespace, podSelector,
                policyTypes != null ? policyTypes : List.of(),
                ingressSummary, egressSummary, creationTimestamp, "networking.k8s.io/v1");
        } catch (Exception e) {
            return null;
        }
    }

    private static List<String> parseRules(List<Map<String, Object>> rules, boolean isIngress) {
        if (rules == null) return List.of();
        return rules.stream().map(rule -> {
            StringBuilder sb = new StringBuilder();
            if (isIngress) sb.append("from: ");
            else sb.append("to: ");

            if (rule.containsKey("ports")) {
                try {
                    List<Map<String, Object>> ports = (List<Map<String, Object>>) rule.get("ports");
                    if (ports != null && !ports.isEmpty()) {
                        sb.append("ports=[");
                        for (Map<String, Object> p : ports) {
                            sb.append(p.getOrDefault("protocol", "TCP")).append("/").append(p.get("port")).append(" ");
                        }
                        sb.append("] ");
                    }
                } catch (Exception ignored) {}
            }

            Object fromArr = rule.get(isIngress ? "from" : "to");
            if (fromArr instanceof List) {
                try {
                    for (Object item : (List<?>) fromArr) {
                        if (item instanceof Map) {
                            Map<String, Object> peer = (Map<String, Object>) item;
                            if (peer.containsKey("ipBlock")) {
                                Map<String, Object> ipBlock = (Map<String, Object>) peer.get("ipBlock");
                                sb.append("cidr=").append(ipBlock.get("cidr")).append(" ");
                            }
                            if (peer.containsKey("namespaceSelector")) {
                                sb.append("ns=all ");
                            }
                            if (peer.containsKey("podSelector")) {
                                Map<String, Object> ps = (Map<String, Object>) peer.get("podSelector");
                                Map<String, Object> ml = (Map<String, Object>) ps.get("matchLabels");
                                if (ml != null && !ml.isEmpty()) sb.append("pods=").append(ml).append(" ");
                                else sb.append("pods=all ");
                            }
                        }
                    }
                } catch (Exception ignored) {}
            }
            return sb.toString().trim();
        }).toList();
    }

    public static List<K8sNetworkPolicyResponse> fromK8sList(Map<String, Object> json) {
        if (json == null) return List.of();
        try {
            List<Map<String, Object>> items = (List<Map<String, Object>>) json.get("items");
            if (items == null) return List.of();
            return items.stream()
                .map(K8sNetworkPolicyResponse::fromK8sJson)
                .filter(r -> r != null)
                .toList();
        } catch (Exception e) {
            return List.of();
        }
    }

    public static K8sNetworkPolicyResponse fromSimulated(String name, String namespace, String podSelector, List<String> policyTypes) {
        return new K8sNetworkPolicyResponse(name, namespace, podSelector,
            policyTypes, List.of(), List.of(), java.time.Instant.now().toString(), "networking.k8s.io/v1");
    }
}
