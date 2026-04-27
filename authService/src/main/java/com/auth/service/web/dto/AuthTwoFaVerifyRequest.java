package com.auth.service.web.dto;

import jakarta.validation.constraints.NotBlank;

public record AuthTwoFaVerifyRequest(
	@NotBlank String code
) {
}
