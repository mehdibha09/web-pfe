package com.auth.auth.web.dto;

import jakarta.validation.constraints.NotBlank;

public record PermissionCreateRequest(
        @NotBlank String name,
        String description
) {
}
