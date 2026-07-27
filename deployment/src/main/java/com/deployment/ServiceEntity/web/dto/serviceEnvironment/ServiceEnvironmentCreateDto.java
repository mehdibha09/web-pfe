package com.deployment.ServiceEntity.web.dto.serviceEnvironment;

import java.util.UUID;

public record ServiceEnvironmentCreateDto(UUID serviceId, UUID environmentId, UUID tenantId) {}
