package com.auth.auth.web.dto;

import java.util.UUID;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record AuthForgotPasswordRequest(
        @NotBlank @Email String email,
        UUID tenantId,
        String tenantName
) {
}
