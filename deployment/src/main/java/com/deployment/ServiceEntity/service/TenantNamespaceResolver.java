package com.deployment.ServiceEntity.service;

import java.util.UUID;

import com.deployment.ServiceEntity.config.UserContext;

public class TenantNamespaceResolver {

    public static String resolve(String requestedNamespace) {
        UUID tenantId = UserContext.getTenantId();
        if (tenantId != null) {
            return "tenant-" + tenantId.toString();
        }
        return requestedNamespace != null && !requestedNamespace.isBlank() ? requestedNamespace : "default";
    }

    public static String resolve() {
        return resolve(null);
    }
}
