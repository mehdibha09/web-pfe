package com.auth.service.web.dto;

import jakarta.validation.constraints.NotBlank;

public record TenantCreateRequest(
        @NotBlank String name,
        String contactEmail,
        String modeDeployment,
        String status
) {
}
