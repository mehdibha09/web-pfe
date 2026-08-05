package com.deployment.ServiceEntity.web.dto.notification;

import java.util.UUID;

public record NotificationCreateDto(
    UUID userId,
    String title,
    String message,
    String type,
    UUID tenantId,
    String link,
    UUID alertId
) {}
