package com.auth.service.web.dto.tenant;

import jakarta.validation.constraints.NotBlank;

public record TenantCreateRequest(
        @NotBlank String name,
        String contactEmail,
        String phone,
        String adminEmail,
        String adminPassword,
        String modeDeployment,
        String status
) {
}
