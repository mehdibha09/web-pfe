package com.auth.service.web.dto.tenant;

public record TenantUpdateRequest(
        String name,
        String contactEmail,
        String phone,
        String modeDeployment,
        String status
) {
}
