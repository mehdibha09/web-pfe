package com.auth.service.web.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record AuthUpdateEmailRequest(
    @NotBlank(message = "New email is required")
    @Email(message = "Invalid email format")
    String newEmail,
    
    @NotBlank(message = "Password is required")
    String password
) {
}
