package com.deployment.ServiceEntity.web.dto.backup;

import java.time.Instant;
import java.util.UUID;

public record BackupResponseDto(
    UUID id,
    UUID vmId,
    UUID serviceEnvironmentId,
    String status,
    String filePath,
    Long sizeMb,
    String type,
    String notes,
    Instant createdAt,
    Instant updatedAt,
    Instant restoredAt) {}
