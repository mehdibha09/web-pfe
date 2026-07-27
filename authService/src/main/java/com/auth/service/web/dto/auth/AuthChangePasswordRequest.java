package com.auth.service.web.dto.auth;

import com.auth.service.validation.Password;
import jakarta.validation.constraints.NotBlank;

public record AuthChangePasswordRequest(
        @NotBlank String currentPassword,
        @NotBlank @Password String newPassword
) {
}
