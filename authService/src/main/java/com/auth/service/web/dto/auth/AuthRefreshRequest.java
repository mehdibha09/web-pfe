package com.auth.service.web.dto.auth;

import jakarta.validation.constraints.NotBlank;

public record AuthRefreshRequest(@NotBlank String refreshToken) {
}
