package com.auth.service.web.dto;

public record AuthTwoFaSetupResponse(
        int codeLength,
        String message
) {
}
