package com.deployment.ServiceEntity.config;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

@Component
public class AuthTokenResolver {

    private static final Logger log = LoggerFactory.getLogger(AuthTokenResolver.class);

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(2))
            .build();

    private final ObjectMapper mapper = new ObjectMapper();

    private final ConcurrentHashMap<String, CacheEntry> cache = new ConcurrentHashMap<>();

    private final String authServiceUrl;

    public AuthTokenResolver(org.springframework.core.env.Environment env) {
        this.authServiceUrl = env.getProperty("auth.service.url", "http://localhost:7070");
    }

    public record ResolvedUser(UUID userId, UUID tenantId, Set<String> permissions) {}

    public ResolvedUser resolve(String bearerToken) {
        if (bearerToken == null || bearerToken.isBlank()) return null;

        String cacheKey = bearerToken.length() > 64 ? bearerToken.substring(0, 64) : bearerToken;
        CacheEntry cached = cache.get(cacheKey);
        if (cached != null && System.currentTimeMillis() < cached.expiry) {
            return cached.user;
        }

        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(authServiceUrl + "/api/v1/auth/me"))
                    .header("Authorization", "Bearer " + bearerToken)
                    .timeout(Duration.ofSeconds(3))
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                log.warn("Auth service returned {} for token resolution", response.statusCode());
                return null;
            }

            JsonNode body = mapper.readTree(response.body());
            UUID userId = UUID.fromString(body.get("userId").asText());
            UUID tenantId = body.has("tenantId") && !body.get("tenantId").isNull()
                    ? UUID.fromString(body.get("tenantId").asText())
                    : null;
            Set<String> permissions = new HashSet<>();
            if (body.has("permissions") && body.get("permissions").isArray()) {
                for (var p : body.get("permissions")) {
                    permissions.add(p.asText());
                }
            }

            ResolvedUser user = new ResolvedUser(userId, tenantId, permissions);
            cache.put(cacheKey, new CacheEntry(user, System.currentTimeMillis() + 300_000));
            return user;
        } catch (Exception e) {
            log.warn("Failed to resolve token via auth service: {}", e.getMessage());
            return null;
        }
    }

    private record CacheEntry(ResolvedUser user, long expiry) {}
}