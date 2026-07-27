package com.auth.service.web.dto.auth;

public record AuthSsoCallbackResponse(
        String provider,
        String code,
        String state,
        String message
) {
}
