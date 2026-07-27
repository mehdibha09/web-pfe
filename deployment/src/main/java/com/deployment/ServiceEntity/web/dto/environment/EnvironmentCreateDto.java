package com.deployment.ServiceEntity.web.dto.environment;

import java.util.UUID;

public record EnvironmentCreateDto(String name, String description, UUID tenantId) {}
