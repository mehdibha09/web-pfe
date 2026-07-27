package com.auth.service.web.dto.tenant;

public record TenantUpdateRequest(
        String name,
        String contactEmail,
        String modeDeployment,
        String status
) {
}
