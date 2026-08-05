package com.auth.service.web.dto.auth;

import jakarta.validation.constraints.NotBlank;

public record AuthTwoFaEmailResendRequest(
        @NotBlank String email
) {
}
