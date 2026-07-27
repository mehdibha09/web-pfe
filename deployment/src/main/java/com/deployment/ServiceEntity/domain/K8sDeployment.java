package com.deployment.ServiceEntity.domain;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

@Entity
@Table(name = "k8s_deployment")
public class K8sDeployment {

    public enum Status {
        CREATED, RUNNING, SCALED, RESTARTED, FAILED, DELETED
    }

    @Id
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Column(name = "docker_image", nullable = false)
    private String dockerImage;

    @Column(nullable = false)
    private int replicas = 1;

    @Column(nullable = false)
    private int port;

    @Column(name = "target_port")
    private Integer targetPort;

    @Column
    private String protocol = "TCP";

    @Column(nullable = false)
    private String namespace = "default";

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private Status status;

    @Column(name = "service_environment_id", nullable = false)
    private UUID serviceEnvironmentId;

    @Column(name = "cpu_request")
    private String cpuRequest;

    @Column(name = "memory_request")
    private String memoryRequest;

    @Column(name = "cpu_limit")
    private String cpuLimit;

    @Column(name = "memory_limit")
    private String memoryLimit;

    @Column(name = "image_pull_policy")
    private String imagePullPolicy = "IfNotPresent";

    @Column(name = "service_type")
    private String serviceType = "ClusterIP";

    @Column(name = "restart_policy")
    private String restartPolicy = "Always";

    @Column(columnDefinition = "TEXT")
    private String labels;

    @Column(columnDefinition = "TEXT")
    private String secrets;

    @Column(columnDefinition = "TEXT")
    private String envVars;

    @Column(name = "liveness_probe", columnDefinition = "TEXT")
    private String livenessProbe;

    @Column(name = "readiness_probe", columnDefinition = "TEXT")
    private String readinessProbe;

    @Column(name = "startup_probe", columnDefinition = "TEXT")
    private String startupProbe;

    @Column(nullable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private Instant updatedAt;

    public K8sDeployment() {}

    @PrePersist
    void onCreate() {
        if (id == null) {
            id = UUID.randomUUID();
        }
        if (createdAt == null) {
            createdAt = Instant.now();
            updatedAt = createdAt;
        }
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDockerImage() { return dockerImage; }
    public void setDockerImage(String dockerImage) { this.dockerImage = dockerImage; }

    public int getReplicas() { return replicas; }
    public void setReplicas(int replicas) { this.replicas = replicas; }

    public int getPort() { return port; }
    public void setPort(int port) { this.port = port; }

    public Integer getTargetPort() { return targetPort; }
    public void setTargetPort(Integer targetPort) { this.targetPort = targetPort; }

    public String getProtocol() { return protocol; }
    public void setProtocol(String protocol) { this.protocol = protocol; }

    public String getNamespace() { return namespace; }
    public void setNamespace(String namespace) { this.namespace = namespace; }

    public UUID getTenantId() { return tenantId; }
    public void setTenantId(UUID tenantId) { this.tenantId = tenantId; }

    public Status getStatus() { return status; }
    public void setStatus(Status status) { this.status = status; }

    public UUID getServiceEnvironmentId() { return serviceEnvironmentId; }
    public void setServiceEnvironmentId(UUID serviceEnvironmentId) { this.serviceEnvironmentId = serviceEnvironmentId; }

    public String getCpuRequest() { return cpuRequest; }
    public void setCpuRequest(String cpuRequest) { this.cpuRequest = cpuRequest; }

    public String getMemoryRequest() { return memoryRequest; }
    public void setMemoryRequest(String memoryRequest) { this.memoryRequest = memoryRequest; }

    public String getCpuLimit() { return cpuLimit; }
    public void setCpuLimit(String cpuLimit) { this.cpuLimit = cpuLimit; }

    public String getMemoryLimit() { return memoryLimit; }
    public void setMemoryLimit(String memoryLimit) { this.memoryLimit = memoryLimit; }

    public String getImagePullPolicy() { return imagePullPolicy; }
    public void setImagePullPolicy(String imagePullPolicy) { this.imagePullPolicy = imagePullPolicy; }

    public String getServiceType() { return serviceType; }
    public void setServiceType(String serviceType) { this.serviceType = serviceType; }

    public String getRestartPolicy() { return restartPolicy; }
    public void setRestartPolicy(String restartPolicy) { this.restartPolicy = restartPolicy; }

    public String getLabels() { return labels; }
    public void setLabels(String labels) { this.labels = labels; }

    public String getSecrets() { return secrets; }
    public void setSecrets(String secrets) { this.secrets = secrets; }

    public String getEnvVars() { return envVars; }
    public void setEnvVars(String envVars) { this.envVars = envVars; }

    public String getLivenessProbe() { return livenessProbe; }
    public void setLivenessProbe(String livenessProbe) { this.livenessProbe = livenessProbe; }

    public String getReadinessProbe() { return readinessProbe; }
    public void setReadinessProbe(String readinessProbe) { this.readinessProbe = readinessProbe; }

    public String getStartupProbe() { return startupProbe; }
    public void setStartupProbe(String startupProbe) { this.startupProbe = startupProbe; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
