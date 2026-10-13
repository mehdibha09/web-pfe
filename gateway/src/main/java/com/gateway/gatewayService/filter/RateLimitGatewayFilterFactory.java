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

    // NOTE: this limiter is per-instance (in-memory) and therefore NOT distributed.
    // Behind multiple gateway replicas each instance keeps its own counters.
    private final Map<String, Window> windows = new ConcurrentHashMap<>();

    // Safety cap on the number of tracked keys to avoid unbounded growth (memory DoS).
    private static final int MAX_ENTRIES = 10_000;

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
            boolean allowed = window.tryAcquire();

            // Opportunistically evict fully-expired windows so the map does not grow unbounded.
            evictExpired();

            if (!allowed) {
                exchange.getResponse().setStatusCode(HttpStatus.TOO_MANY_REQUESTS);
                return exchange.getResponse().setComplete();
            }

            return chain.filter(exchange);
        };
    }

    /**
     * Removes windows that have fully expired (no request within their window duration).
     * Runs opportunistically on each request; a full sweep is only triggered once the
     * map crosses {@link #MAX_ENTRIES} to keep the common path cheap.
     */
    private void evictExpired() {
        if (windows.size() <= MAX_ENTRIES) {
            return;
        }
        long now = System.currentTimeMillis();
        windows.values().removeIf(w -> w.isExpired(now));
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

        boolean isExpired(long now) {
            return now - windowStart > windowMs;
        }
    }
}