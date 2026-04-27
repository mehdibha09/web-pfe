package com.auth.auth.web.dto;

import jakarta.validation.constraints.NotBlank;

public record RoleCreateRequest(
        @NotBlank String name,
        String description
) {
}
