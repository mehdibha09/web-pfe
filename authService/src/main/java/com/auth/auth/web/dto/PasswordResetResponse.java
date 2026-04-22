package com.auth.auth.web.dto;

public record PasswordResetResponse(
        String message,
        String resetToken
) {
}
