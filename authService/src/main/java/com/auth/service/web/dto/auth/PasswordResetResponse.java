package com.auth.service.web.dto.auth;

public record PasswordResetResponse(
        String message,
        String resetToken
) {
}
