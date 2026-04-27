package com.auth.service.web.dto;

public record AuthSsoRedirectResponse(
        String provider,
        String redirectUrl,
        String state
) {
}
