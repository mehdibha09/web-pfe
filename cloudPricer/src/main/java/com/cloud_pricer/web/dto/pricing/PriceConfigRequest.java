package com.cloud_pricer.web.dto.pricing;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record PriceConfigRequest(
    @NotBlank
    @Pattern(regexp = "VM|KUBERNETES", message = "mode must be VM or KUBERNETES") String mode,
    @NotBlank
    @Pattern(regexp = "CPU|RAM|DISK|NETWORK|BACKUP|OS",
             message = "resourceType must be one of CPU, RAM, DISK, NETWORK, BACKUP, OS") String resourceType,
    @Min(0) double pricePerUnit,
    @NotBlank String unit,
    @NotBlank String currency,
    boolean isActive
) {
}
