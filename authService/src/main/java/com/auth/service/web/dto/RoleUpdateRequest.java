package com.auth.service.web.dto;

public record RoleUpdateRequest(
        String name,
        String description
) {
}
