package com.gateway.gatewayService.filter;

import java.net.URI;
import java.util.ArrayList;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cloud.gateway.filter.GatewayFilter;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.factory.AbstractGatewayFilterFactory;
import org.springframework.http.HttpCookie;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import org.springframework.web.server.ServerWebExchange;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.gateway.gatewayService.config.IdentitySigner;

import reactor.core.publisher.Mono;

@Component
public class AuthGatewayFilterFactory extends AbstractGatewayFilterFactory<AuthGatewayFilterFactory.Config> {

    private static final Logger log = LoggerFactory.getLogger(AuthGatewayFilterFactory.class);

    private final WebClient webClient;
    private final ObjectMapper mapper = new ObjectMapper();
    private final IdentitySigner identitySigner;

    public AuthGatewayFilterFactory(WebClient.Builder webClientBuilder,
                                     org.springframework.core.env.Environment env,
                                     IdentitySigner identitySigner) {
        super(Config.class);
        String authUrl = env.getProperty("auth-service-url", "http://localhost:7070");
        this.webClient = webClientBuilder.baseUrl(authUrl).build();
        this.identitySigner = identitySigner;
        log.info("AuthGatewayFilterFactory using auth-service-url: {}", authUrl);
    }

    /**
     * Removes any client-supplied identity headers so they cannot be forged
     * or confused with the ones injected by the gateway.
     */
    private static ServerWebExchange stripClientIdentityHeaders(ServerWebExchange exchange) {
        List<String> identityHeaders = List.of(
                IdentitySigner.ID_HEADER_USER_ID,
                IdentitySigner.ID_HEADER_TENANT_ID,
                IdentitySigner.ID_HEADER_ROLES,
                IdentitySigner.ID_HEADER_PERMISSIONS,
                IdentitySigner.SIGNATURE_HEADER);
        List<String> names = new ArrayList<>(identityHeaders);
        HttpHeaders current = exchange.getRequest().getHeaders();
        for (String name : names) {
            if (current.containsKey(name)) {
                exchange = exchange.mutate().request(r -> r.headers(h -> h.remove(name))).build();
            }
        }
        return exchange;
    }

    private static String resolveToken(ServerWebExchange exchange) {
        String authHeader = exchange.getRequest().getHeaders().getFirst("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7);
        }
        String queryToken = exchange.getRequest().getQueryParams().getFirst("token");
        if (queryToken != null && !queryToken.isBlank()) {
            return queryToken;
        }
        org.springframework.http.HttpCookie cookieToken = exchange.getRequest().getCookies().getFirst("access_token");
        if (cookieToken != null && cookieToken.getValue() != null && !cookieToken.getValue().isBlank()) {
            return cookieToken.getValue();
        }
        return null;
    }

    private static ServerWebExchange injectAuthHeader(ServerWebExchange exchange, String token) {
        return exchange.mutate()
                .request(r -> r.header("Authorization", "Bearer " + token))
                .build();
    }

    private static ServerWebExchange stripTokenParam(ServerWebExchange exchange) {
        String query = exchange.getRequest().getURI().getRawQuery();
        if (query == null || !query.contains("token="))
            return exchange;
        String newQuery = query.replaceAll("&?token=[^&]*", "").replaceAll("^&", "");
        try {
            URI newUri = new URI(
                    exchange.getRequest().getURI().getScheme(),
                    exchange.getRequest().getURI().getRawAuthority(),
                    exchange.getRequest().getURI().getRawPath(),
                    newQuery.isEmpty() ? null : newQuery,
                    exchange.getRequest().getURI().getRawFragment());
            return exchange.mutate().request(r -> r.uri(newUri)).build();
        } catch (Exception e) {
            return exchange;
        }
    }

    @Override
    public GatewayFilter apply(Config config) {
        return (exchange, chain) -> {
            String token = resolveToken(exchange);
            if (token == null) {
                exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
                return exchange.getResponse().setComplete();
            }

            exchange = injectAuthHeader(exchange, token);
            exchange = stripTokenParam(exchange);
            exchange = stripClientIdentityHeaders(exchange);

            return resolveAndInjectContext(exchange, chain, token);
        };
    }

    private Mono<Void> resolveAndInjectContext(ServerWebExchange exchange, GatewayFilterChain chain, String token) {
        return webClient.get()
                .uri("/api/v1/auth/me")
                .header("Authorization", "Bearer " + token)
                .retrieve()
                .bodyToMono(String.class)
                .flatMap(body -> {
                    try {
                        JsonNode node = mapper.readTree(body);
                        String userId = node.has("userId") && !node.get("userId").isNull()
                                ? node.get("userId").asText()
                                : null;
                        String tenantId = node.has("tenantId") && !node.get("tenantId").isNull()
                                ? node.get("tenantId").asText()
                                : null;
                        JsonNode rolesNode = node.has("roles") ? node.get("roles") : null;
                        String rolesJson = (rolesNode != null && rolesNode.isArray() && rolesNode.size() > 0)
                                ? rolesNode.toString()
                                : null;
                        JsonNode permissionsNode = node.has("permissions") ? node.get("permissions") : null;
                        String permissionsJson = (permissionsNode != null && permissionsNode.isArray() && permissionsNode.size() > 0)
                                ? permissionsNode.toString()
                                : null;

                        ServerWebExchange mutated = exchange;
                        if (userId != null) {
                            mutated = mutated.mutate()
                                    .request(r -> r.header(IdentitySigner.ID_HEADER_USER_ID, userId))
                                    .build();
                        }
                        if (tenantId != null) {
                            mutated = mutated.mutate()
                                    .request(r -> r.header(IdentitySigner.ID_HEADER_TENANT_ID, tenantId))
                                    .build();
                        }
                        if (rolesJson != null) {
                            mutated = mutated.mutate()
                                    .request(r -> r.header(IdentitySigner.ID_HEADER_ROLES, rolesJson))
                                    .build();
                        }
                        if (permissionsJson != null) {
                            mutated = mutated.mutate()
                                    .request(r -> r.header(IdentitySigner.ID_HEADER_PERMISSIONS, permissionsJson))
                                    .build();
                        }

                        String signature = identitySigner.sign(
                                userId == null ? "" : userId,
                                tenantId == null ? "" : tenantId,
                                rolesJson == null ? "" : rolesJson,
                                permissionsJson == null ? "" : permissionsJson);
                        mutated = mutated.mutate()
                                .request(r -> r.header(IdentitySigner.SIGNATURE_HEADER, signature))
                                .build();

                        return chain.filter(mutated);
                    } catch (Exception e) {
                        log.warn("Failed to parse auth service response: {}", e.getMessage());
                        return chain.filter(exchange);
                    }
                })
                .onErrorResume(e -> {
                    if (e instanceof WebClientResponseException wcre && wcre.getStatusCode() == HttpStatus.UNAUTHORIZED) {
                        log.warn("Token rejected by auth service: {}", e.getMessage());
                        exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
                    } else {
                        log.error("Auth service unreachable or error: {}", e.getMessage());
                        exchange.getResponse().setStatusCode(HttpStatus.BAD_GATEWAY);
                    }
                    return exchange.getResponse().setComplete();
                });
    }

    public static class Config {
    }
}
