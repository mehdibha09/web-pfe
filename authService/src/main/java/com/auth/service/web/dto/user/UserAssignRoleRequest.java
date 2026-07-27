package com.auth.service.web.dto.user;

import java.util.UUID;

import jakarta.validation.constraints.NotNull;

public record UserAssignRoleRequest(@NotNull UUID roleId) {
}
