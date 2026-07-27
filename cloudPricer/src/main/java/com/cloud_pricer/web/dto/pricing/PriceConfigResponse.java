package com.cloud_pricer.web.dto.pricing;

import java.time.Instant;
import java.util.UUID;

public record PriceConfigResponse(
    UUID id,
    String mode,
    String resourceType,
    double pricePerUnit,
    String unit,
    String currency,
    boolean isActive,
    Instant createdAt,
    Instant updatedAt
) {
}
