package com.auth.service.web.dto.user;

import com.auth.service.validation.Password;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record UserCreateRequest(
        @NotBlank @Email String email,
        @NotBlank @Password String password,
        String status
) {
}
