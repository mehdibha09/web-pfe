package com.auth.service.web.dto.auth;

public record AuthLoginResponse(
        AuthTokensResponse tokens,
        AuthMeResponse me,
        boolean twoFaRequired,
        String message
) {
}
