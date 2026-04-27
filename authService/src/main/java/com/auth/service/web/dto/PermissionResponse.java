package com.auth.service.web.dto;

import java.util.UUID;

public record PermissionResponse(
        UUID id,
        String name,
        String description
) {
}
