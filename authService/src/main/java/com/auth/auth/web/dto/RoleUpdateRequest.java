package com.auth.auth.web.dto;

public record RoleUpdateRequest(
        String name,
        String description
) {
}
