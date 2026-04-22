package com.auth.auth.web.dto;

import java.util.List;
import java.util.UUID;

public record AuthMeResponse(
        UUID userId,
        String email,
        UUID tenantId,
        String tenantName,
        String status,
        List<String> roles,
        List<String> permissions,
        boolean twoFaEnabled
) {
}
