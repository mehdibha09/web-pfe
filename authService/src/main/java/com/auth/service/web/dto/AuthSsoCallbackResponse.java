package com.auth.service.web.dto;

public record AuthSsoCallbackResponse(
        String provider,
        String code,
        String state,
        String message
) {
}
