package com.deployment.ServiceEntity.service;

import java.util.List;
import java.util.UUID;

import com.deployment.ServiceEntity.config.UserContext;

public class TenantNamespaceResolver {

    /** Nombre de caractères du UUID utilisés dans le namespace tenant. */
    public static final int TENANT_ID_PREFIX_LENGTH = 8;

    /** Namespaces système / plateforme masqués (liste noire) pour les non-superadmin. */
    public static final List<String> SYSTEM_NAMESPACES = List.of(
        "kube-system",
        "kube-public",
        "kube-node-lease",
        "calico-system",
        "tigera-operator",
        "local-path-storage",
        "monitoring"
    );

    /** Renvoie {@code true} si un namespace appartient à la liste noire. */
    public static boolean isSystemNamespace(String namespace) {
        return namespace != null && SYSTEM_NAMESPACES.contains(namespace);
    }

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

    /**
     * Applique la liste noire des namespaces système sur une liste de ressources.
     * S'applique même au super-admin (les namespaces système ne doivent jamais
     * apparaître dans les listes de ressources K8s fonctionnelles).
     */
    public static <T> List<T> applyBlacklist(List<T> items, java.util.function.Function<T, String> namespaceOf) {
        return items.stream()
                .filter(item -> !isSystemNamespace(namespaceOf.apply(item)))
                .toList();
    }
}
