package com.auth.service.web.dto;

import jakarta.validation.constraints.NotBlank;

public record RoleCreateRequest(
        @NotBlank String name,
        String description
) {
}
