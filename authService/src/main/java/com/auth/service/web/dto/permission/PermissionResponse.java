package com.auth.service.web.dto.permission;

import java.util.UUID;

public record PermissionResponse(
        UUID id,
        String name,
        String description
) {
}
