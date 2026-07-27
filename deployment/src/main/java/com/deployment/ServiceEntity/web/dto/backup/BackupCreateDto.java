package com.deployment.ServiceEntity.web.dto.backup;

import java.util.UUID;

import jakarta.validation.constraints.NotNull;

public record BackupCreateDto(
    @NotNull UUID vmId,
    @NotNull UUID serviceEnvironmentId,
    String notes,
    String frequency,
    Integer retentionDays,
    String maintenanceWindow) {}
