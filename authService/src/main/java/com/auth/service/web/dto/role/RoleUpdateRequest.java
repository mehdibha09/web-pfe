package com.auth.service.web.dto.role;

public record RoleUpdateRequest(
        String name,
        String description
) {
}
