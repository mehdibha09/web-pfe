package com.auth.auth.web.dto;

import jakarta.validation.constraints.NotBlank;

public record AuthTwoFaEmailVerifyRequest(
        @NotBlank String email,
        @NotBlank String code
) {
}