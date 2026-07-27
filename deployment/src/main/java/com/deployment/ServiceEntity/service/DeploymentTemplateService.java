package com.deployment.ServiceEntity.service;

import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import com.deployment.ServiceEntity.config.UserContext;
import com.deployment.ServiceEntity.domain.DeploymentTemplate;
import com.deployment.ServiceEntity.exception.ApiException;
import com.deployment.ServiceEntity.repository.DeploymentTemplateRepository;
import com.deployment.ServiceEntity.web.dto.k8s.DeploymentTemplateRequest;
import com.deployment.ServiceEntity.web.dto.k8s.DeploymentTemplateResponse;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Service
@RequiredArgsConstructor
public class DeploymentTemplateService {

    private static final Logger log = LoggerFactory.getLogger(DeploymentTemplateService.class);
    private final DeploymentTemplateRepository repository;

    public DeploymentTemplateResponse create(DeploymentTemplateRequest dto) {
        UUID tenantId = UserContext.getTenantId();
        DeploymentTemplate t = new DeploymentTemplate();
        t.setName(dto.name());
        t.setDescription(dto.description());
        t.setDockerImage(dto.dockerImage());
        t.setPort(dto.port() > 0 ? dto.port() : 80);
        t.setCpuLimit(dto.cpuLimit());
        t.setMemoryLimit(dto.memoryLimit());
        t.setCpuRequest(dto.cpuRequest());
        t.setMemoryRequest(dto.memoryRequest());
        t.setEnvVars(dto.envVars());
        t.setLabels(dto.labels());
        t.setProtocol(dto.protocol() != null ? dto.protocol() : "TCP");
        t.setImagePullPolicy(dto.imagePullPolicy() != null ? dto.imagePullPolicy() : "IfNotPresent");
        t.setServiceType(dto.serviceType() != null ? dto.serviceType() : "ClusterIP");
        t.setRestartPolicy(dto.restartPolicy() != null ? dto.restartPolicy() : "Always");
        t.setLivenessProbe(dto.livenessProbe());
        t.setReadinessProbe(dto.readinessProbe());
        t.setStartupProbe(dto.startupProbe());
        t.setTenantId(tenantId);
        return DeploymentTemplateResponse.from(repository.save(t));
    }

    public List<DeploymentTemplateResponse> getAll(UUID tenantId) {
        return repository.findByTenantId(tenantId).stream()
                .map(DeploymentTemplateResponse::from).toList();
    }

    public Page<DeploymentTemplateResponse> getAll(UUID tenantId, Pageable pageable) {
        return repository.findByTenantId(tenantId, pageable)
                .map(DeploymentTemplateResponse::from);
    }

    public DeploymentTemplateResponse getById(UUID id) {
        DeploymentTemplate t = repository.findById(id)
            .orElseThrow(() -> new EntityNotFoundException("Template not found: " + id));
        if (!t.getTenantId().equals(UserContext.getTenantId())) {
            throw new EntityNotFoundException("Template not found: " + id);
        }
        return DeploymentTemplateResponse.from(t);
    }

    public DeploymentTemplateResponse update(UUID id, DeploymentTemplateRequest dto) {
        DeploymentTemplate t = repository.findById(id)
            .orElseThrow(() -> new EntityNotFoundException("Template not found: " + id));
        t.setName(dto.name());
        t.setDescription(dto.description());
        t.setDockerImage(dto.dockerImage());
        t.setPort(dto.port() > 0 ? dto.port() : 80);
        t.setCpuLimit(dto.cpuLimit());
        t.setMemoryLimit(dto.memoryLimit());
        t.setCpuRequest(dto.cpuRequest());
        t.setMemoryRequest(dto.memoryRequest());
        t.setEnvVars(dto.envVars());
        t.setLabels(dto.labels());
        t.setProtocol(dto.protocol() != null ? dto.protocol() : "TCP");
        t.setImagePullPolicy(dto.imagePullPolicy() != null ? dto.imagePullPolicy() : "IfNotPresent");
        t.setServiceType(dto.serviceType() != null ? dto.serviceType() : "ClusterIP");
        t.setRestartPolicy(dto.restartPolicy() != null ? dto.restartPolicy() : "Always");
        t.setLivenessProbe(dto.livenessProbe());
        t.setReadinessProbe(dto.readinessProbe());
        t.setStartupProbe(dto.startupProbe());
        return DeploymentTemplateResponse.from(repository.save(t));
    }

    public void delete(UUID id) {
        if (!repository.existsById(id)) {
            throw new EntityNotFoundException("Template not found: " + id);
        }
        repository.deleteById(id);
        log.info("Deployment template deleted: id={}", id);
    }
}
