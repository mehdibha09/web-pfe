package com.auth.service.web.dto.auth;

public record AuthTwoFaSetupResponse(
        int codeLength,
        String message,
        String secret,
        String qrCodeUri,
        String qrCodePngBase64
) {
}