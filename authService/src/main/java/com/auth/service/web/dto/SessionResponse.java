package com.auth.service.web.dto;

import java.time.Instant;
import java.util.UUID;

public record SessionResponse(
        UUID id,
        UUID userId,
        String userEmail,
        String accessToken,
        String refreshToken,
        Instant expirationDate,
        Instant createdAt,
        String ipAddress,
        String browser,
        String os,
        String localization,
        Instant revokedAt
) {
}
