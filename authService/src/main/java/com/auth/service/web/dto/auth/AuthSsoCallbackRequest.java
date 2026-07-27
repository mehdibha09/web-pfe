package com.auth.service.web.dto.auth;

public record AuthSsoCallbackRequest(
        String provider,
        String code,
        String state
) {
}
