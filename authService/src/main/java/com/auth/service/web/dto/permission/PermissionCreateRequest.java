package com.auth.service.web.dto.permission;

import jakarta.validation.constraints.NotBlank;

public record PermissionCreateRequest(
        @NotBlank String name,
        String description
) {
}
