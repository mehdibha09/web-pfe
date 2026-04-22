package com.auth.auth.web.dto;

import jakarta.validation.constraints.NotBlank;

public record AuthResetPasswordRequest(
        @NotBlank String token,
        @NotBlank String newPassword
) {
}
