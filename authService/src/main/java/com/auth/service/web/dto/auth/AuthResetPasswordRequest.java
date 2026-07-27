package com.auth.service.web.dto.auth;

import com.auth.service.validation.Password;
import jakarta.validation.constraints.NotBlank;

public record AuthResetPasswordRequest(
        @NotBlank String token,
        @NotBlank @Password String newPassword
) {
}
