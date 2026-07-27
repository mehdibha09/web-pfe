package com.auth.service.web.dto.role;

import java.util.UUID;

public record RolePermissionAssignRequest(
        UUID permissionId,
        String permissionName,
        String description
) {
}
