package com.auth.service.web.dto;

public record PermissionUpdateRequest(
        String name,
        String description
) {
}
