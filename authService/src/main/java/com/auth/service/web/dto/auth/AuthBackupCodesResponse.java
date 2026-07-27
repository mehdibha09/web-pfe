package com.auth.service.web.dto.auth;

import java.util.List;

public record AuthBackupCodesResponse(
        List<String> codes,
        String message
) {
}