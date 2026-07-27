package com.auth.service.web.dto.auth;

import jakarta.validation.constraints.NotBlank;

public record AuthTwoFaVerifyRequest(
	@NotBlank String code
) {
}