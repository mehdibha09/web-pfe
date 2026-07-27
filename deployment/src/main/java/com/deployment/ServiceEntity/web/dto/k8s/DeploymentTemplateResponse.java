package com.deployment.ServiceEntity.web.dto.k8s;

import java.time.Instant;
import java.util.UUID;
import com.deployment.ServiceEntity.domain.DeploymentTemplate;

public record DeploymentTemplateResponse(
    UUID id,
    String name,
    String description,
    String dockerImage,
    int port,
    String cpuLimit,
    String memoryLimit,
    String cpuRequest,
    String memoryRequest,
    String envVars,
    String labels,
    String protocol,
    String imagePullPolicy,
    String serviceType,
    String restartPolicy,
    String livenessProbe,
    String readinessProbe,
    String startupProbe,
    UUID tenantId,
    Instant createdAt,
    Instant updatedAt) {

    public static DeploymentTemplateResponse from(DeploymentTemplate t) {
        return new DeploymentTemplateResponse(
            t.getId(), t.getName(), t.getDescription(),
            t.getDockerImage(), t.getPort(),
            t.getCpuLimit(), t.getMemoryLimit(),
            t.getCpuRequest(), t.getMemoryRequest(),
            t.getEnvVars(), t.getLabels(),
            t.getProtocol(), t.getImagePullPolicy(),
            t.getServiceType(), t.getRestartPolicy(),
            t.getLivenessProbe(), t.getReadinessProbe(), t.getStartupProbe(),
            t.getTenantId(), t.getCreatedAt(), t.getUpdatedAt());
    }
}
