package com.auth.service.web.dto.auth;

public record AuthTokensResponse(
        String accessToken,
        String refreshToken,
        String tokenType,
        long expiresIn
) {
}
