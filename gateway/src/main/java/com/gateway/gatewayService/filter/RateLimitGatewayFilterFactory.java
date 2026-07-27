package com.gateway.gatewayService.filter;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

import org.springframework.cloud.gateway.filter.GatewayFilter;
import org.springframework.cloud.gateway.filter.factory.AbstractGatewayFilterFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

@Component
public class RateLimitGatewayFilterFactory extends AbstractGatewayFilterFactory<RateLimitGatewayFilterFactory.Config> {

    private final Map<String, Window> windows = new ConcurrentHashMap<>();

    public RateLimitGatewayFilterFactory() {
        super(Config.class);
    }

    @Override
    public GatewayFilter apply(Config config) {
        return (exchange, chain) -> {
            String clientIp = exchange.getRequest().getRemoteAddress() != null
                    ? exchange.getRequest().getRemoteAddress().getAddress().getHostAddress()
                    : "unknown";
            String key = clientIp + ":" + exchange.getRequest().getURI().getPath();

            Window window = windows.computeIfAbsent(key, k -> new Window(config.maxRequests, config.windowMs));
            if (!window.tryAcquire()) {
                exchange.getResponse().setStatusCode(HttpStatus.TOO_MANY_REQUESTS);
                return exchange.getResponse().setComplete();
            }

            return chain.filter(exchange);
        };
    }

    public static class Config {
        public int maxRequests = 20;
        public long windowMs = 60000;
    }

    private static class Window {
        private final int maxRequests;
        private final long windowMs;
        private final AtomicInteger count = new AtomicInteger(0);
        private volatile long windowStart = System.currentTimeMillis();

        Window(int maxRequests, long windowMs) {
            this.maxRequests = maxRequests;
            this.windowMs = windowMs;
        }

        synchronized boolean tryAcquire() {
            long now = System.currentTimeMillis();
            if (now - windowStart > windowMs) {
                count.set(0);
                windowStart = now;
            }
            return count.incrementAndGet() <= maxRequests;
        }
    }
}