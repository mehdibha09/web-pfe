package com.deployment.ServiceEntity.web.dto.notification;

import java.time.Instant;
import java.util.UUID;

public record NotificationResponseDto(
    UUID id,
    UUID userId,
    String title,
    String message,
    String type,
    boolean read,
    UUID tenantId,
    String link,
    Instant createdAt,
    Instant updatedAt
) {}
