package com.auth.auth.web.dto;

public record TenantUpdateRequest(
        String name,
        String contactEmail,
        String modeDeployment,
        String status
) {
}
