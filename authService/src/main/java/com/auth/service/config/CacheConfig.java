package com.auth.service.config;

import java.time.Duration;

import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import com.github.benmanes.caffeine.cache.Caffeine;

/**
 * Cache des réponses API (endpoints read-heavy de l'UI admin).
 *
 * Isolation multi-tenant : chaque clé de cache est préfixée par le contexte
 * de la requête (headers X-User-Tenant-Id / X-User-Id signés par la gateway)
 * via le bean {@code cacheKeys} ({@link CacheKeys}). Un tenant ne peut donc
 * jamais lire le cache d'un autre tenant, même si la même méthode est appelée
 * avec les mêmes arguments.
 *
 * Stratégie d'invalidation : TTL court (60 s) + @CacheEvict sur les
 * opérations d'écriture (create/update/delete). Pas de cache distribué :
 * chaque pod garde son cache local (acceptable pour des TTL courts).
 */
@Configuration
@EnableCaching
public class CacheConfig {

    /** Cache des listes paginées — invalidé à chaque création/modification. */
    public static final String TENANTS = "tenants";
    public static final String USERS = "users";
    public static final String SESSIONS = "sessions";
    public static final String ROLES = "roles";
    public static final String PERMISSIONS = "permissions";

    @Bean
    public CacheManager cacheManager() {
        CaffeineCacheManager cacheManager = new CaffeineCacheManager(
                TENANTS, USERS, SESSIONS, ROLES, PERMISSIONS);
        cacheManager.setCaffeine(Caffeine.newBuilder()
                .expireAfterWrite(Duration.ofSeconds(60))
                .maximumSize(500)
                .recordStats());
        return cacheManager;
    }

    /**
     * Clé de cache tenant-aware : préfixe la clé avec le tenant de l'appelant
     * (lu depuis les en-têtes signés X-User-* via RequestContextHolder).
     * Utilisée dans les SpEL : key = "@cacheKeys.tenantScoped(#pageable)".
     */
    @Bean("cacheKeys")
    public CacheKeys cacheKeys() {
        return new CacheKeys();
    }

    public static class CacheKeys {

        public String tenantScoped(Object suffix) {
            String tenantId = currentHeader("X-User-Tenant-Id");
            String userId = currentHeader("X-User-Id");
            String scope = tenantId != null ? "tenant:" + tenantId : "anon";
            return scope + (userId != null ? ":u" + userId : "") + ":" + suffix;
        }

        public String global(Object suffix) {
            return "global:" + suffix;
        }

        private static String currentHeader(String name) {
            var attrs = RequestContextHolder.getRequestAttributes();
            if (attrs instanceof ServletRequestAttributes servletAttrs) {
                return servletAttrs.getRequest().getHeader(name);
            }
            return null;
        }
    }
}
