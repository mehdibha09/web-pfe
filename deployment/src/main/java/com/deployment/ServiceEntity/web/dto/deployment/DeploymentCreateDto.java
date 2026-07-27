package com.deployment.ServiceEntity.web.dto.deployment;

import java.util.UUID;

public record DeploymentCreateDto(
    String version, String notes, String status, UUID serviceEnvironmentId) {}
