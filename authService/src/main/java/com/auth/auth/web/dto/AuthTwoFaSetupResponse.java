package com.auth.auth.web.dto;

public record AuthTwoFaSetupResponse(
        int codeLength,
        String message
) {
}
