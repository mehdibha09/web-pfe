package com.auth.service.web.dto.permission;

public record PermissionUpdateRequest(
        String name,
        String description
) {
}
