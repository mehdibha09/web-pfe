package com.auth.auth.web.dto;

import jakarta.validation.constraints.NotBlank;

public record AuthChangePasswordRequest(
        @NotBlank String currentPassword,
        @NotBlank String newPassword
) {
}
