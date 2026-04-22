package com.auth.auth.web.dto;

public record AuthTokensResponse(
        String accessToken,
        String refreshToken,
        String tokenType,
        long expiresIn
) {
}
