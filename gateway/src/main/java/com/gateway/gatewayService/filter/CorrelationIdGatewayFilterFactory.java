package com.gateway.gatewayService.filter;

import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.cloud.gateway.filter.GatewayFilter;
import org.springframework.cloud.gateway.filter.factory.AbstractGatewayFilterFactory;
import org.springframework.stereotype.Component;

@Component
public class CorrelationIdGatewayFilterFactory extends AbstractGatewayFilterFactory<CorrelationIdGatewayFilterFactory.Config> {

    private static final Logger log = LoggerFactory.getLogger(CorrelationIdGatewayFilterFactory.class);
    private static final String CORRELATION_ID_HEADER = "X-Correlation-Id";

    public CorrelationIdGatewayFilterFactory() {
        super(Config.class);
    }

    @Override
    public GatewayFilter apply(Config config) {
        return (exchange, chain) -> {
            String existing = exchange.getRequest().getHeaders().getFirst(CORRELATION_ID_HEADER);
            String correlationId = (existing != null && !existing.isBlank())
                    ? existing
                    : UUID.randomUUID().toString().replace("-", "");

            MDC.put("correlationId", correlationId);
            log.debug("Correlation ID: {}", correlationId);

            exchange = exchange.mutate()
                    .request(r -> r.header(CORRELATION_ID_HEADER, correlationId))
                    .build();

            return chain.filter(exchange);
        };
    }

    public static class Config {
    }
}