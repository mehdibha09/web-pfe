package com.deployment.ServiceEntity.web.dto.k8s;

import java.util.List;
import java.util.Map;
import jakarta.validation.constraints.NotBlank;

public record K8sIngressRequest(
    @NotBlank String name,
    String namespace,
    String ingressClassName,
    List<Rule> rules,
    List<TLS> tls,
    Map<String, String> labels) {

    public record Rule(
        String host,
        List<Path> paths) {}

    public record Path(
        String path,
        String pathType,
        @NotBlank String serviceName,
        int servicePort) {}

    public record TLS(
        List<String> hosts,
        String secretName) {}}