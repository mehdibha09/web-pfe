package com.auth.auth.web.dto;

public record AuthLoginResponse(
        AuthTokensResponse tokens,
        AuthMeResponse me
) {
}
