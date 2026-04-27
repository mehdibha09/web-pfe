package com.auth.service.web.dto;

import java.util.UUID;

import jakarta.validation.constraints.NotNull;

public record RoleAssignUserRequest(@NotNull UUID userId) {
}
