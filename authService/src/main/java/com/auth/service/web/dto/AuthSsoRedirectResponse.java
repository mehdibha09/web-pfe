package com.auth.auth.web.dto;

public record AuthSsoRedirectResponse(
        String provider,
        String redirectUrl,
        String state
) {
}
