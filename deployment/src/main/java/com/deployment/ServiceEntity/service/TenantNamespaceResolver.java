package com.deployment.ServiceEntity.service;

import java.util.UUID;

import com.deployment.ServiceEntity.config.UserContext;

public class TenantNamespaceResolver {

    /** Nombre de caractères du UUID utilisés dans le namespace tenant. */
    public static final int TENANT_ID_PREFIX_LENGTH = 8;

    /**
     * Préfixe du namespace propre au tenant connecté : {@code tenant-{id8}}.
     * Retourne {@code null} si aucun tenant n'est connecté (super-admin / plateforme).
     */
    public static String tenantNamespacePrefix() {
        UUID tenantId = UserContext.getTenantId();
        if (tenantId == null) {
            return null;
        }
        return "tenant-" + tenantId.toString().substring(0, TENANT_ID_PREFIX_LENGTH).toLowerCase();
    }

    public static String resolve(String requestedNamespace) {
        String prefix = tenantNamespacePrefix();
        if (prefix != null) {
            return prefix;
        }
        return requestedNamespace != null && !requestedNamespace.isBlank() ? requestedNamespace : "default";
    }

    /**
     * Résolution pour les opérations de LISTE :
     * un tenant ne voit que son propre namespace ({@code tenant-{id8}}),
     * un super-admin voit tout le cluster ({@code null} => --all-namespaces)
     * ou le namespace demandé.
     */
    public static String resolveList(String requestedNamespace) {
        String prefix = tenantNamespacePrefix();
        if (prefix != null) {
            return prefix;
        }
        return requestedNamespace != null && !requestedNamespace.isBlank() ? requestedNamespace : null;
    }

    public static String resolve() {
        return resolve(null);
    }
}
