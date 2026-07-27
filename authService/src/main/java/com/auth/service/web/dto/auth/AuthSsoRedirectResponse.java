package com.auth.service.web.dto.auth;

public record AuthSsoRedirectResponse(
        String provider,
        String redirectUrl,
        String state
) {
}
