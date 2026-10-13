package com.deployment.ServiceEntity.web.dto.k8s;

import java.time.Instant;
import java.util.UUID;

import com.deployment.ServiceEntity.domain.K8sDeployment;

public record K8sDeploymentResponse(
    UUID id,
    String name,
    String dockerImage,
    int replicas,
    int port,
    Integer targetPort,
    String protocol,
    String namespace,
    UUID tenantId,
    String status,
    UUID serviceEnvironmentId,
    String cpuRequest,
    String memoryRequest,
    String cpuLimit,
    String memoryLimit,
    String imagePullPolicy,
    String serviceType,
    String restartPolicy,
    String labels,
    String secrets,
    String envVars,
    ProbeConfig livenessProbe,
    ProbeConfig readinessProbe,
    ProbeConfig startupProbe,
    Instant createdAt,
    Instant updatedAt) {

    public static K8sDeploymentResponse from(K8sDeployment entity) {
        return new K8sDeploymentResponse(
                entity.getId(),
                entity.getName(),
                entity.getDockerImage(),
                entity.getReplicas(),
                entity.getPort(),
                entity.getTargetPort(),
                entity.getProtocol(),
                entity.getNamespace(),
                entity.getTenantId(),
                entity.getStatus().name(),
                entity.getServiceEnvironmentId(),
                entity.getCpuRequest(),
                entity.getMemoryRequest(),
                entity.getCpuLimit(),
                entity.getMemoryLimit(),
                entity.getImagePullPolicy(),
                entity.getServiceType(),
                entity.getRestartPolicy(),
                entity.getLabels(),
                maskPairs(entity.getSecrets()),
                maskPairs(entity.getEnvVars()),
                parseProbe(entity.getLivenessProbe()),
                parseProbe(entity.getReadinessProbe()),
                parseProbe(entity.getStartupProbe()),
                entity.getCreatedAt(),
                entity.getUpdatedAt());
    }

    private static ProbeConfig parseProbe(String json) {
        if (json == null || json.isBlank()) return null;
        try {
            return new com.fasterxml.jackson.databind.ObjectMapper().readValue(json, ProbeConfig.class);
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * Masque les valeurs de paires KEY=value (liste CSV) avant toute réponse :
     * on ne ré-émet que les NOMS de variables/secrets, jamais les valeurs en
     * clair (fuite cross-tenant / exposition des secrets stockés en base).
     */
    private static String maskPairs(String csv) {
        if (csv == null || csv.isBlank()) return csv;
        java.util.StringJoiner sj = new java.util.StringJoiner(",");
        for (String pair : csv.split(",")) {
            String p = pair.trim();
            if (p.isEmpty()) continue;
            int eq = p.indexOf('=');
            if (eq > 0) {
                sj.add(p.substring(0, eq) + "=********");
            } else {
                sj.add(p);
            }
        }
        return sj.toString();
    }
}
