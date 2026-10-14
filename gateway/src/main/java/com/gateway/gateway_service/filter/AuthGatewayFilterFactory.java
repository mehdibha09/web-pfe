package com.gateway.gateway_service.filter;

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
import com.gateway.gateway_service.config.IdentitySigner;

import reactor.core.publisher.Mono;

@Component
public class AuthGatewayFilterFactory extends AbstractGatewayFilterFactory<AuthGatewayFilterFactory.Config> {

    private static final Logger log = LoggerFactory.getLogger(AuthGatewayFilterFactory.class);

    private static final String AUTHORIZATION = "Authorization";
    private static final String BEARER_PREFIX = "Bearer ";
    private static final String USER_ID_FIELD = "userId";
    private static final String TENANT_ID_FIELD = "tenantId";
    private static final String ROLES_FIELD = "roles";
    private static final String PERMISSIONS_FIELD = "permissions";

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
        String authHeader = exchange.getRequest().getHeaders().getFirst(AUTHORIZATION);
        if (authHeader != null && authHeader.startsWith(BEARER_PREFIX)) {
            return authHeader.substring(7);
        }
        String queryToken = exchange.getRequest().getQueryParams().getFirst("token");
        if (queryToken != null && !queryToken.isBlank()) {
            return queryToken;
        }
        HttpCookie cookieToken = exchange.getRequest().getCookies().getFirst("access_token");
        if (cookieToken != null && !cookieToken.getValue().isBlank()) {
            return cookieToken.getValue();
        }
        return null;
    }

    private static ServerWebExchange injectAuthHeader(ServerWebExchange exchange, String token) {
        return exchange.mutate()
                .request(r -> r.header(AUTHORIZATION, BEARER_PREFIX + token))
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
                .header(AUTHORIZATION, BEARER_PREFIX + token)
                .retrieve()
                .bodyToMono(String.class)
                .flatMap(body -> forwardWithIdentity(exchange, chain, body))
                .onErrorResume(e -> handleAuthError(exchange, e));
    }

    /** Parse la réponse de /me, injecte les identités signées et poursuit la chaîne. */
    private Mono<Void> forwardWithIdentity(ServerWebExchange exchange, GatewayFilterChain chain, String body) {
        try {
            JsonNode node = mapper.readTree(body);
            Identity identity = Identity.from(node);
            ServerWebExchange mutated = addIdentityHeaders(exchange, identity);
            return chain.filter(mutated);
        } catch (Exception e) {
            log.warn("Failed to parse auth service response: {}", e.getMessage());
            return chain.filter(exchange);
        }
    }

    private ServerWebExchange addIdentityHeaders(ServerWebExchange exchange, Identity identity) {
        ServerWebExchange mutated = exchange;
        mutated = setHeaderIfPresent(mutated, IdentitySigner.ID_HEADER_USER_ID, identity.userId());
        mutated = setHeaderIfPresent(mutated, IdentitySigner.ID_HEADER_TENANT_ID, identity.tenantId());
        mutated = setHeaderIfPresent(mutated, IdentitySigner.ID_HEADER_ROLES, identity.rolesJson());
        mutated = setHeaderIfPresent(mutated, IdentitySigner.ID_HEADER_PERMISSIONS, identity.permissionsJson());

        String signature = identitySigner.sign(
                orEmpty(identity.userId()),
                orEmpty(identity.tenantId()),
                orEmpty(identity.rolesJson()),
                orEmpty(identity.permissionsJson()));
        return setHeader(mutated, IdentitySigner.SIGNATURE_HEADER, signature);
    }

    private static ServerWebExchange setHeaderIfPresent(ServerWebExchange exchange, String name, String value) {
        return value == null ? exchange : setHeader(exchange, name, value);
    }

    private static ServerWebExchange setHeader(ServerWebExchange exchange, String name, String value) {
        return exchange.mutate().request(r -> r.header(name, value)).build();
    }

    private static String orEmpty(String value) {
        return value == null ? "" : value;
    }

    /** Gère les erreurs de l'auth-service : 401 si le token est rejeté, 502 sinon. */
    private static Mono<Void> handleAuthError(ServerWebExchange exchange, Throwable e) {
        if (e instanceof WebClientResponseException wcre && wcre.getStatusCode() == HttpStatus.UNAUTHORIZED) {
            log.warn("Token rejected by auth service: {}", e.getMessage());
            exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
        } else {
            log.error("Auth service unreachable or error: {}", e.getMessage());
            exchange.getResponse().setStatusCode(HttpStatus.BAD_GATEWAY);
        }
        return exchange.getResponse().setComplete();
    }

    /** Identité extraite de la réponse /me (valeurs nulles si absentes). */
    private record Identity(String userId, String tenantId, String rolesJson, String permissionsJson) {

        static Identity from(JsonNode node) {
            return new Identity(
                    text(node, USER_ID_FIELD),
                    text(node, TENANT_ID_FIELD),
                    nonEmptyArrayJson(node, ROLES_FIELD),
                    nonEmptyArrayJson(node, PERMISSIONS_FIELD));
        }

        private static String text(JsonNode node, String field) {
            JsonNode value = node.get(field);
            return value == null || value.isNull() ? null : value.asText();
        }

        private static String nonEmptyArrayJson(JsonNode node, String field) {
            JsonNode value = node.get(field);
            return value != null && value.isArray() && value.size() > 0 ? value.toString() : null;
        }
    }

    /** Aucun paramètre : requis par Spring Cloud Gateway pour déclarer la factory. */
    public static final class Config {
        Config() {
        }
    }
}
