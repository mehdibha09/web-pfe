package com.cloud_pricer.config;

import java.util.Collections;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

public final class UserContext {

    private static final ThreadLocal<UUID> userIdHolder = new ThreadLocal<>();
    private static final ThreadLocal<UUID> tenantIdHolder = new ThreadLocal<>();
    private static final ThreadLocal<Set<String>> permissionsHolder = new ThreadLocal<>();

    private UserContext() {}

    public static void set(UUID userId, UUID tenantId) {
        userIdHolder.set(userId);
        tenantIdHolder.set(tenantId);
    }

    public static void set(UUID userId, UUID tenantId, Set<String> permissions) {
        userIdHolder.set(userId);
        tenantIdHolder.set(tenantId);
        permissionsHolder.set(permissions != null ? Collections.unmodifiableSet(new HashSet<>(permissions)) : Collections.emptySet());
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
    }
}