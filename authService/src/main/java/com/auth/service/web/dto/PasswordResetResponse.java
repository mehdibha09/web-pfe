package com.auth.service.web.dto;

public record PasswordResetResponse(
        String message,
        String resetToken
) {
}
