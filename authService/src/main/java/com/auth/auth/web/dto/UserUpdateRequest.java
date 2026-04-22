package com.auth.auth.web.dto;

import jakarta.validation.constraints.Email;

public record UserUpdateRequest(
        @Email String email,
        String password,
        String status
) {
}
