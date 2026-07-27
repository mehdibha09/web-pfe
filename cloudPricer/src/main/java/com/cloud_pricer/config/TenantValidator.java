package com.cloud_pricer.config;

import java.util.UUID;

import org.springframework.stereotype.Component;

import com.cloud_pricer.domain.ServiceEnvironment;
import com.cloud_pricer.exception.ApiException;
import com.cloud_pricer.repository.ServiceEnvironmentRepository;

import org.springframework.http.HttpStatus;

@Component
public class TenantValidator {

    private final ServiceEnvironmentRepository serviceEnvironmentRepository;

    public TenantValidator(ServiceEnvironmentRepository serviceEnvironmentRepository) {
        this.serviceEnvironmentRepository = serviceEnvironmentRepository;
    }

    public void validateServiceEnvironment(UUID serviceEnvironmentId) {
        UUID tenantId = UserContext.getTenantId();
        ServiceEnvironment se = serviceEnvironmentRepository.findById(serviceEnvironmentId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND",
                        "ServiceEnvironment not found: " + serviceEnvironmentId));
        if (!se.getTenantId().equals(tenantId)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN",
                    "ServiceEnvironment does not belong to this tenant");
        }
    }
}