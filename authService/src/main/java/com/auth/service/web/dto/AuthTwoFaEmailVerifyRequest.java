package com.auth.service.web.dto;

import jakarta.validation.constraints.NotBlank;

public record AuthTwoFaEmailVerifyRequest(
        @NotBlank String email,
        @NotBlank String code
) {
}