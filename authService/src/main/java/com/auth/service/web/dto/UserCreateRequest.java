package com.auth.service.web.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record UserCreateRequest(
        @NotBlank @Email String email,
        @NotBlank String password,
        String status
) {
}
