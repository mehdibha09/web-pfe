package com.deployment.ServiceEntity.config;

import java.util.Map;

import org.springframework.context.annotation.Configuration;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;
import org.springframework.web.socket.server.HandshakeInterceptor;

import lombok.RequiredArgsConstructor;

@Configuration
@EnableWebSocket
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketConfigurer {

    private final SshWebSocketHandler sshWebSocketHandler;
    private final AgentWebSocketHandler agentWebSocketHandler;

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        HandshakeInterceptor headerInterceptor = new HandshakeInterceptor() {
            @Override
            public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response,
                    WebSocketHandler wsHandler, Map<String, Object> attributes) {
                attributes.put("X-User-Id", getHeader(request, "X-User-Id"));
                attributes.put("X-Tenant-Id", getHeader(request, "X-Tenant-Id"));
                attributes.put("X-User-Permissions", getHeader(request, "X-User-Permissions"));
                return true;
            }

            private String getHeader(ServerHttpRequest request, String name) {
                var values = request.getHeaders().get(name);
                return (values != null && !values.isEmpty()) ? values.get(0) : null;
            }

            @Override
            public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response,
                    WebSocketHandler wsHandler, Exception exception) {
            }
        };

        registry.addHandler(sshWebSocketHandler, "/ws/ssh/{vmId}")
                .addInterceptors(headerInterceptor)
                .setAllowedOrigins("*");
        registry.addHandler(agentWebSocketHandler, "/ws/agent/{vmId}/{token}")
                .addInterceptors(headerInterceptor)
                .setAllowedOrigins("*");
    }
}
