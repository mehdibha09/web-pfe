package com.deployment.ServiceEntity.web.dto.ssh;

import jakarta.validation.constraints.NotBlank;

public record SshExecuteRequest(@NotBlank(message = "command is required") String command) {}
