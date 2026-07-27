package com.deployment.ServiceEntity.web.dto.service;

import java.util.UUID;

public record ServiceCreateDto(String name, String type, String status, UUID tenantId) {}
