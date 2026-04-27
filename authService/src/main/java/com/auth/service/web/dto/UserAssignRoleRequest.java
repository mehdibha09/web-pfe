package com.auth.auth.web.dto;

import java.util.UUID;

import jakarta.validation.constraints.NotNull;

public record UserAssignRoleRequest(@NotNull UUID roleId) {
}
