package com.gateway.gatewayService.filter;

import java.net.URI;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cloud.gateway.filter.GatewayFilter;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.factory.AbstractGatewayFilterFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import org.springframework.web.server.ServerWebExchange;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import reactor.core.publisher.Mono;

@Component
public class AuthGatewayFilterFactory extends AbstractGatewayFilterFactory<AuthGatewayFilterFactory.Config> {

    private static final Logger log = LoggerFactory.getLogger(AuthGatewayFilterFactory.class);

    private final WebClient webClient;
    private final ObjectMapper mapper = new ObjectMapper();

    private static final String AUTH_SERVICE_URL = "http://localhost:7070";

    public AuthGatewayFilterFactory(WebClient.Builder webClientBuilder) {
        super(Config.class);
        this.webClient = webClientBuilder.baseUrl(AUTH_SERVICE_URL).build();
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

                        ServerWebExchange mutated = exchange;

                        if (userId != null) {
                            mutated = mutated.mutate()
                                    .request(r -> r.header("X-User-Id", userId))
                                    .build();
                        }
                        if (tenantId != null) {
                            mutated = mutated.mutate()
                                    .request(r -> r.header("X-Tenant-Id", tenantId))
                                    .build();
                        }

                        JsonNode permissions = node.has("permissions") ? node.get("permissions") : null;
                        if (permissions != null && permissions.isArray() && permissions.size() > 0) {
                            String permsJson = permissions.toString();
                            mutated = mutated.mutate()
                                    .request(r -> r.header("X-User-Permissions", permsJson))
                                    .build();
                        }

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
