package com.auth.auth.web.dto;

import java.util.List;
import java.util.UUID;

import jakarta.validation.constraints.NotNull;

public record UserUpdateRolesRequest(@NotNull List<UUID> roleIds) {
}
