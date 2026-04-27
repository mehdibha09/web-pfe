package com.auth.service.web.dto;

import java.util.List;
import java.util.UUID;

import jakarta.validation.constraints.NotNull;

public record UserUpdateRolesRequest(@NotNull List<UUID> roleIds) {
}
