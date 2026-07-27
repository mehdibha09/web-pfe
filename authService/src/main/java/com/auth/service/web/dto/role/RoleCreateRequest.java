package com.auth.service.web.dto.role;

import java.util.List;
import jakarta.validation.constraints.NotBlank;

public record RoleCreateRequest(
        @NotBlank String name,
        String description,
        List<String> permissions
) {
}
