package com.deployment.ServiceEntity.config;

import java.util.Collections;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

public final class UserContext {

    private static final ThreadLocal<UUID> userIdHolder = new ThreadLocal<>();
    private static final ThreadLocal<UUID> tenantIdHolder = new ThreadLocal<>();
    private static final ThreadLocal<Set<String>> permissionsHolder = new ThreadLocal<>();
    private static final ThreadLocal<Set<String>> rolesHolder = new ThreadLocal<>();

    public static void set(UUID userId, UUID tenantId) {
        userIdHolder.set(userId);
        tenantIdHolder.set(tenantId);
    }

    public static void set(UUID userId, UUID tenantId, Set<String> permissions) {
        userIdHolder.set(userId);
        tenantIdHolder.set(tenantId);
        permissionsHolder.set(permissions != null ? Collections.unmodifiableSet(new HashSet<>(permissions)) : Collections.emptySet());
    }

    public static void set(UUID userId, UUID tenantId, Set<String> permissions, Set<String> roles) {
        userIdHolder.set(userId);
        tenantIdHolder.set(tenantId);
        permissionsHolder.set(permissions != null ? Collections.unmodifiableSet(new HashSet<>(permissions)) : Collections.emptySet());
        rolesHolder.set(roles != null ? Collections.unmodifiableSet(new HashSet<>(roles)) : Collections.emptySet());
    }

    public static UUID getUserId() {
        return userIdHolder.get();
    }

    public static UUID getTenantId() {
        return tenantIdHolder.get();
    }

    public static Set<String> getPermissions() {
        Set<String> perms = permissionsHolder.get();
        return perms != null ? perms : Collections.emptySet();
    }

    public static Set<String> getRoles() {
        Set<String> roles = rolesHolder.get();
        return roles != null ? roles : Collections.emptySet();
    }

    public static boolean hasRole(String role) {
        Set<String> roles = rolesHolder.get();
        return roles != null && roles.stream().anyMatch(r -> r != null && r.equalsIgnoreCase(role));
    }

    public static boolean isSuperAdmin() {
        return hasRole("super-admin") || hasRole("SUPER_ADMIN") || hasRole("PLATFORM_ADMIN");
    }

    public static boolean hasPermission(String permission) {
        Set<String> perms = permissionsHolder.get();
        return perms != null && perms.contains(permission);
    }

    public static void requirePermission(String permission) {
        if (!hasPermission(permission)) {
            throw new SecurityException("Missing required permission: " + permission);
        }
    }

    public static void clear() {
        userIdHolder.remove();
        tenantIdHolder.remove();
        permissionsHolder.remove();
        rolesHolder.remove();
    }

    private UserContext() {}
}