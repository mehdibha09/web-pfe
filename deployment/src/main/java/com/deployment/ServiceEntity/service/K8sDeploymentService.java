package com.deployment.ServiceEntity.service;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import com.deployment.ServiceEntity.config.UserContext;
import com.deployment.ServiceEntity.domain.K8sDeployment;
import com.deployment.ServiceEntity.domain.KubernetesClient;
import com.deployment.ServiceEntity.domain.ServiceEnvironment;
import com.deployment.ServiceEntity.repository.K8sDeploymentRepository;
import com.deployment.ServiceEntity.repository.ServiceEnvironmentRepository;
import com.deployment.ServiceEntity.web.dto.k8s.K8sDeploymentRequest;
import com.deployment.ServiceEntity.web.dto.k8s.K8sDeploymentResponse;
import com.deployment.ServiceEntity.web.dto.k8s.K8sHpaRequest;
import com.deployment.ServiceEntity.web.dto.k8s.K8sHpaResponse;
import com.deployment.ServiceEntity.web.dto.k8s.K8sPodResponse;
import com.deployment.ServiceEntity.web.dto.k8s.ProbeConfig;
import com.fasterxml.jackson.databind.ObjectMapper;

import com.deployment.ServiceEntity.exception.ApiException;

import jakarta.persistence.EntityNotFoundException;

import org.springframework.http.HttpStatus;

@Service
public class K8sDeploymentService {

    private static final Logger log = LoggerFactory.getLogger(K8sDeploymentService.class);

    private final K8sDeploymentRepository k8sDeploymentRepository;
    private final KubernetesClient kubernetesClient;
    private final ObjectMapper objectMapper;
    private final ServiceEnvironmentRepository serviceEnvironmentRepository;
    private final QuotaEnforcementService quotaEnforcementService;

    public K8sDeploymentService(K8sDeploymentRepository k8sDeploymentRepository, KubernetesClient kubernetesClient, ObjectMapper objectMapper, ServiceEnvironmentRepository serviceEnvironmentRepository, QuotaEnforcementService quotaEnforcementService) {
        this.k8sDeploymentRepository = k8sDeploymentRepository;
        this.kubernetesClient = kubernetesClient;
        this.objectMapper = objectMapper;
        this.serviceEnvironmentRepository = serviceEnvironmentRepository;
        this.quotaEnforcementService = quotaEnforcementService;
    }

    public K8sDeploymentResponse create(K8sDeploymentRequest dto) {
        UUID tenantId = UserContext.getTenantId();
        ServiceEnvironment se = verifyServiceEnvironmentOwnership(dto.serviceEnvironmentId());
        quotaEnforcementService.enforceK8s(se.getId(), dto.replicas() > 0 ? dto.replicas() : 1,
                dto.cpuRequest(), dto.memoryRequest());
        K8sDeployment deployment = new K8sDeployment();
        deployment.setName(dto.name());
        deployment.setDockerImage(dto.dockerImage());
        deployment.setReplicas(dto.replicas() > 0 ? dto.replicas() : 1);
        deployment.setPort(dto.port());
        deployment.setTenantId(tenantId);
        deployment.setNamespace(buildNamespace(se));
        deployment.setStatus(K8sDeployment.Status.CREATED);
        deployment.setServiceEnvironmentId(se.getId());
        deployment.setTargetPort(dto.targetPort());
        deployment.setProtocol(dto.protocol());
        deployment.setCpuRequest(dto.cpuRequest());
        deployment.setMemoryRequest(dto.memoryRequest());
        deployment.setCpuLimit(dto.cpuLimit());
        deployment.setMemoryLimit(dto.memoryLimit());
        deployment.setImagePullPolicy(dto.imagePullPolicy());
        deployment.setServiceType(dto.serviceType());
        deployment.setRestartPolicy(dto.restartPolicy());
        deployment.setLabels(dto.labels());
        deployment.setSecrets(dto.secrets());
        deployment.setEnvVars(dto.envVars());
        deployment.setLivenessProbe(toJson(dto.livenessProbe()));
        deployment.setReadinessProbe(toJson(dto.readinessProbe()));
        deployment.setStartupProbe(toJson(dto.startupProbe()));

        K8sDeployment saved = k8sDeploymentRepository.save(deployment);

        try {
            kubernetesClient.createNamespace(saved.getNamespace());
            kubernetesClient.createDeployment(saved);
            saved.setStatus(K8sDeployment.Status.RUNNING);
            log.info("K8s deployment created: id={} name={}", saved.getId(), saved.getName());
        } catch (Exception e) {
            saved.setStatus(K8sDeployment.Status.FAILED);
            log.error("Failed to create K8s deployment {}: {}", saved.getName(), e.getMessage());
        }

        return K8sDeploymentResponse.from(k8sDeploymentRepository.save(saved));
    }

    public K8sDeploymentResponse getById(UUID id, UUID tenantId) {
        K8sDeployment deployment = findOwned(id, tenantId);
        return K8sDeploymentResponse.from(deployment);
    }

    public List<K8sDeploymentResponse> getAll(UUID tenantId) {
        return k8sDeploymentRepository.findByTenantId(tenantId).stream()
                .map(K8sDeploymentResponse::from)
                .toList();
    }

    public Page<K8sDeploymentResponse> getAll(UUID tenantId, Pageable pageable) {
        return k8sDeploymentRepository.findByTenantId(tenantId, pageable)
                .map(K8sDeploymentResponse::from);
    }

    public List<K8sDeploymentResponse> getAllByServiceEnvironment(UUID serviceEnvironmentId) {
        verifyServiceEnvironmentOwnership(serviceEnvironmentId);
        return k8sDeploymentRepository.findByServiceEnvironmentId(serviceEnvironmentId).stream()
                .map(K8sDeploymentResponse::from)
                .toList();
    }

    public void delete(UUID id, UUID tenantId) {
        K8sDeployment deployment = findOwned(id, tenantId);

        kubernetesClient.deleteDeployment(deployment.getName(), deployment.getNamespace());
        deployment.setStatus(K8sDeployment.Status.DELETED);
        k8sDeploymentRepository.save(deployment);
        k8sDeploymentRepository.delete(deployment);
    }

    public void deleteByServiceEnvironment(UUID serviceEnvironmentId) {
        List<K8sDeployment> deploys = k8sDeploymentRepository.findByServiceEnvironmentId(serviceEnvironmentId);
        for (K8sDeployment d : deploys) {
            try {
                kubernetesClient.deleteDeployment(d.getName(), d.getNamespace());
            } catch (Exception e) {
                log.warn("Failed to delete K8s deployment {}: {}", d.getName(), e.getMessage());
            }
        }
        k8sDeploymentRepository.deleteByServiceEnvironmentId(serviceEnvironmentId);
    }

    public K8sDeploymentResponse scale(UUID id, int replicas, UUID tenantId) {
        K8sDeployment deployment = findOwned(id, tenantId);
        if (replicas < 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_REPLICAS", "Replicas cannot be negative");
        }
        quotaEnforcementService.enforceK8sScale(deployment.getServiceEnvironmentId(), deployment.getReplicas(), replicas);

        kubernetesClient.scaleDeployment(deployment.getName(), replicas, deployment.getNamespace());
        deployment.setReplicas(replicas);
        deployment.setStatus(K8sDeployment.Status.SCALED);
        log.info("K8s deployment scaled: id={} replicas={}", id, replicas);

        return K8sDeploymentResponse.from(k8sDeploymentRepository.save(deployment));
    }

    public K8sDeploymentResponse rollback(UUID id, Integer revision, UUID tenantId) {
        K8sDeployment deployment = findOwned(id, tenantId);

        kubernetesClient.rollbackDeployment(deployment.getName(), deployment.getNamespace(), revision);
        deployment.setStatus(K8sDeployment.Status.RESTARTED);
        log.info("K8s deployment rolled back: id={} revision={}", id, revision);

        return K8sDeploymentResponse.from(k8sDeploymentRepository.save(deployment));
    }

    public K8sDeploymentResponse restart(UUID id, UUID tenantId) {
        K8sDeployment deployment = findOwned(id, tenantId);

        kubernetesClient.restartDeployment(deployment.getName(), deployment.getNamespace());
        deployment.setStatus(K8sDeployment.Status.RESTARTED);
        log.info("K8s deployment restarted: id={}", id);

        return K8sDeploymentResponse.from(k8sDeploymentRepository.save(deployment));
    }

    public Map<String, Object> getStatus(UUID id, UUID tenantId) {
        K8sDeployment deployment = findOwned(id, tenantId);

        return kubernetesClient.getStatus(deployment.getName(), deployment.getNamespace());
    }

    public List<K8sPodResponse> getPods(UUID id, UUID tenantId) {
        K8sDeployment deployment = findOwned(id, tenantId);

        return kubernetesClient.getPods(deployment.getName(), deployment.getNamespace());
    }

    public String getLogs(UUID id, UUID tenantId) {
        K8sDeployment deployment = findOwned(id, tenantId);

        return kubernetesClient.getLogs(deployment.getName(), deployment.getNamespace());
    }

    public String getEvents(UUID id, UUID tenantId) {
        K8sDeployment deployment = findOwned(id, tenantId);

        return kubernetesClient.getEvents(deployment.getName(), deployment.getNamespace());
    }

    public K8sHpaResponse configureHpa(UUID id, K8sHpaRequest dto, UUID tenantId) {
        K8sDeployment deployment = findOwned(id, tenantId);

        kubernetesClient.createOrUpdateHpa(deployment.getName(), deployment.getNamespace(),
            dto.minReplicas(), dto.maxReplicas(),
            dto.cpuTargetAverageUtilization(), dto.memoryTargetAverageUtilization());

        K8sHpaResponse hpa = kubernetesClient.getHpa(deployment.getName(), deployment.getNamespace());
        if (hpa == null) {
            hpa = K8sHpaResponse.fromSimulated(deployment.getName(), deployment.getNamespace(),
                dto.minReplicas(), dto.maxReplicas(),
                dto.cpuTargetAverageUtilization(), dto.memoryTargetAverageUtilization());
        }
        log.info("HPA configured for deployment: id={} name={} min={} max={}", id, deployment.getName(), dto.minReplicas(), dto.maxReplicas());
        return hpa;
    }

    public K8sHpaResponse getHpa(UUID id, UUID tenantId) {
        K8sDeployment deployment = findOwned(id, tenantId);

        K8sHpaResponse hpa = kubernetesClient.getHpa(deployment.getName(), deployment.getNamespace());
        if (hpa == null) {
            log.info("No HPA found for deployment {} (id={})", deployment.getName(), id);
            return null;
        }
        return hpa;
    }

    public void removeHpa(UUID id, UUID tenantId) {
        K8sDeployment deployment = findOwned(id, tenantId);

        kubernetesClient.deleteHpa(deployment.getName(), deployment.getNamespace());
        log.info("HPA removed for deployment: id={} name={}", id, deployment.getName());
    }

    private K8sDeployment findOwned(UUID id, UUID tenantId) {
        K8sDeployment deployment = k8sDeploymentRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("K8s deployment not found: " + id));
        if (tenantId != null && !deployment.getTenantId().equals(tenantId)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Access denied to this deployment");
        }
        return deployment;
    }

    private ServiceEnvironment verifyServiceEnvironmentOwnership(UUID serviceEnvironmentId) {
        ServiceEnvironment se = serviceEnvironmentRepository.findById(serviceEnvironmentId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND",
                        "Service environment not found"));
        if (!se.getTenantId().equals(UserContext.getTenantId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN",
                    "Access denied to this service environment");
        }
        return se;
    }

    private String buildNamespace(ServiceEnvironment se) {
        return TenantNamespaceResolver.resolve(null);
    }

    private String toJson(Object value) {
        if (value == null) return null;
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception e) {
            log.warn("Failed to serialize probe config: {}", e.getMessage());
            return null;
        }
    }
}
