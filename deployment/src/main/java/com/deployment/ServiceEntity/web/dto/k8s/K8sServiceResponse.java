package com.deployment.ServiceEntity.web.dto.k8s;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

public record K8sServiceResponse(
    String name,
    String namespace,
    String type,
    String clusterIp,
    List<String> externalIps,
    List<ServicePort> ports,
    Map<String, String> selector,
    Map<String, String> labels,
    String createdAt,
    String apiVersion) {

    public record ServicePort(
        String name,
        String protocol,
        int port,
        int targetPort,
        Integer nodePort) {}

    @SuppressWarnings("unchecked")
    public static K8sServiceResponse fromK8sJson(Map<String, Object> json) {
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

            Map<String, Object> spec = (Map<String, Object>) json.get("spec");
            if (spec == null) return null;

            String type = (String) spec.getOrDefault("type", "ClusterIP");
            String clusterIp = (String) spec.get("clusterIP");

            List<String> externalIps = (List<String>) spec.get("externalIPs");
            if (externalIps == null) externalIps = List.of();

            Map<String, Object> rawSelector = (Map<String, Object>) spec.get("selector");
            Map<String, String> selector = rawSelector != null
                ? rawSelector.entrySet().stream().collect(Collectors.toMap(Map.Entry::getKey, e -> e.getValue().toString()))
                : Map.of();

            List<Map<String, Object>> rawPorts = (List<Map<String, Object>>) spec.get("ports");
            List<ServicePort> ports = rawPorts != null
                ? rawPorts.stream().map(p -> {
                    String pName = (String) p.get("name");
                    String proto = (String) p.getOrDefault("protocol", "TCP");
                    int port = ((Number) p.getOrDefault("port", 0)).intValue();
                    int targetPort = p.get("targetPort") != null
                        ? ((Number) p.get("targetPort")).intValue()
                        : port;
                    Integer nodePort = p.get("nodePort") != null
                        ? ((Number) p.get("nodePort")).intValue()
                        : null;
                    return new ServicePort(pName, proto, port, targetPort, nodePort);
                }).toList()
                : List.of();

            return new K8sServiceResponse(name, namespace != null ? namespace : "default",
                type, clusterIp, externalIps, ports, selector, labels,
                creationTimestamp, "v1");
        } catch (Exception e) {
            return null;
        }
    }

    @SuppressWarnings("unchecked")
    public static List<K8sServiceResponse> fromK8sList(Map<String, Object> json) {
        if (json == null) return List.of();
        try {
            List<Map<String, Object>> items = (List<Map<String, Object>>) json.get("items");
            if (items == null) return List.of();
            return items.stream()
                .map(K8sServiceResponse::fromK8sJson)
                .filter(r -> r != null)
                .toList();
        } catch (Exception e) {
            return List.of();
        }
    }

    public static K8sServiceResponse fromSimulated(String name, String namespace, String type,
            int port, int targetPort, Map<String, String> selector) {
        return new K8sServiceResponse(name, namespace, type, "10.0.0.1", List.of(),
            List.of(new ServicePort("", "TCP", port, targetPort, type.equals("NodePort") ? 30001 : null)),
            selector, Map.of(), java.time.Instant.now().toString(), "v1");
    }
}