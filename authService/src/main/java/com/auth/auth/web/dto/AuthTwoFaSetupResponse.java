package com.auth.auth.web.dto;

import java.util.List;

public record AuthTwoFaSetupResponse(
        String secret,
        String otpAuthUrl,
        List<String> backupCodes,
        String message
) {
}
