package com.auth.auth.web.dto;

import jakarta.validation.constraints.NotBlank;

public record TenantCreateRequest(
        @NotBlank String name,
        String contactEmail,
        String modeDeployment,
        String status
) {
}
