package com.auth.auth.web.dto;

import java.util.UUID;

public record RolePermissionAssignRequest(
        UUID permissionId,
        String permissionName,
        String description
) {
}
