package com.cloud_pricer.web.dto.pricing;

import java.util.UUID;

public record PriceConfigRequest(
    String mode,
    String resourceType,
    double pricePerUnit,
    String unit,
    String currency,
    boolean isActive
) {
}
