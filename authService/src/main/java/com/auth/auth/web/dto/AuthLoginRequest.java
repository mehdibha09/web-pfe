package com.auth.auth.web.dto;

import java.util.UUID;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record AuthLoginRequest(
        @NotBlank @Email String email,
        @NotBlank String password,
        UUID tenantId,
        String tenantName
) {
}
