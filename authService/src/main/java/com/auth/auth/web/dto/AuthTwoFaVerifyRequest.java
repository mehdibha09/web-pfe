package com.auth.auth.web.dto;

import jakarta.validation.constraints.NotBlank;

public record AuthTwoFaVerifyRequest(@NotBlank String code) {
}
