package com.auth.service.web.dto;

public record AuthLoginResponse(
        AuthTokensResponse tokens,
        AuthMeResponse me,
        boolean twoFaRequired,
        String message
) {
}
