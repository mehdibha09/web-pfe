package com.deployment.ServiceEntity.web.dto.k8s;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

public record K8sIngressResponse(
    String name,
    String namespace,
    Map<String, String> labels,
    String ingressClassName,
    List<IngressRule> rules,
    List<IngressTLS> tls,
    List<String> addresses,
    String createdAt,
    String apiVersion) {

    public record IngressRule(
        String host,
        List<IngressPath> paths) {}

    public record IngressPath(
        String path,
        String pathType,
        String serviceName,
        int servicePort) {}

    public record IngressTLS(
        List<String> hosts,
        String secretName) {}

    @SuppressWarnings("unchecked")
    public static K8sIngressResponse fromK8sJson(Map<String, Object> json) {
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

            String ingressClassName = (String) spec.get("ingressClassName");

            // ── Rules ──
            List<Map<String, Object>> rawRules = (List<Map<String, Object>>) spec.get("rules");
            List<IngressRule> rules = rawRules != null
                ? rawRules.stream().map(r -> {
                    String host = (String) r.get("host");
                    Map<String, Object> http = (Map<String, Object>) r.get("http");
                    List<IngressPath> paths = List.of();
                    if (http != null) {
                        List<Map<String, Object>> rawPaths = (List<Map<String, Object>>) http.get("paths");
                        if (rawPaths != null) {
                            paths = rawPaths.stream().map(p -> {
                                String path = (String) p.get("path");
                                String pathType = (String) p.getOrDefault("pathType", "Prefix");
                                Map<String, Object> backend = (Map<String, Object>) p.get("backend");
                                String svcName = "";
                                int svcPort = 0;
                                if (backend != null) {
                                    Map<String, Object> svc = (Map<String, Object>) backend.get("service");
                                    if (svc != null) {
                                        svcName = (String) svc.get("name");
                                        Map<String, Object> port = (Map<String, Object>) svc.get("port");
                                        if (port != null) {
                                            svcPort = port.get("number") != null
                                                ? ((Number) port.get("number")).intValue()
                                                : 0;
                                        }
                                    }
                                }
                                return new IngressPath(path != null ? path : "/", pathType, svcName, svcPort);
                            }).toList();
                        }
                    }
                    return new IngressRule(host, paths);
                }).toList()
                : List.of();

            // ── TLS ──
            List<Map<String, Object>> rawTls = (List<Map<String, Object>>) spec.get("tls");
            List<IngressTLS> tls = rawTls != null
                ? rawTls.stream().map(t -> {
                    List<String> hosts = (List<String>) t.get("hosts");
                    String secretName = (String) t.get("secretName");
                    return new IngressTLS(hosts != null ? hosts : List.of(), secretName);
                }).toList()
                : List.of();

            // ── LoadBalancer addresses ──
            Map<String, Object> status = (Map<String, Object>) json.get("status");
            List<String> addresses = List.of();
            if (status != null) {
                Map<String, Object> lb = (Map<String, Object>) status.get("loadBalancer");
                if (lb != null) {
                    List<Map<String, Object>> ingress = (List<Map<String, Object>>) lb.get("ingress");
                    if (ingress != null) {
                        addresses = ingress.stream()
                            .map(i -> {
                                String ip = (String) i.get("ip");
                                String hostname = (String) i.get("hostname");
                                return ip != null ? ip : (hostname != null ? hostname : "");
                            })
                            .filter(s -> !s.isEmpty())
                            .toList();
                    }
                }
            }

            return new K8sIngressResponse(name, namespace != null ? namespace : "default",
                labels, ingressClassName, rules, tls, addresses, creationTimestamp, "v1");
        } catch (Exception e) {
            return null;
        }
    }

    @SuppressWarnings("unchecked")
    public static List<K8sIngressResponse> fromK8sList(Map<String, Object> json) {
        if (json == null) return List.of();
        try {
            List<Map<String, Object>> items = (List<Map<String, Object>>) json.get("items");
            if (items == null) return List.of();
            return items.stream()
                .map(K8sIngressResponse::fromK8sJson)
                .filter(r -> r != null)
                .toList();
        } catch (Exception e) {
            return List.of();
        }
    }

    public static K8sIngressResponse fromSimulated(String name, String namespace, String host, String svcName, int svcPort) {
        return new K8sIngressResponse(name, namespace, Map.of(), "", 
            List.of(new IngressRule(host, List.of(new IngressPath("/", "Prefix", svcName, svcPort)))),
            List.of(), List.of(), java.time.Instant.now().toString(), "v1");
    }
}