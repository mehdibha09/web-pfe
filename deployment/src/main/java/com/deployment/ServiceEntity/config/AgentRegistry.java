package com.deployment.ServiceEntity.config;

import java.io.IOException;
import java.util.Base64;
import java.util.concurrent.ConcurrentHashMap;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.BinaryMessage;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import com.fasterxml.jackson.databind.ObjectMapper;

@Component
public class AgentRegistry {

    private static final Logger log = LoggerFactory.getLogger(AgentRegistry.class);
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private final ConcurrentHashMap<String, WebSocketSession> agents = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, WebSocketSession> frontends = new ConcurrentHashMap<>();

    // ── Agent management ─────────────────────────────────────────────────────

    public void registerAgent(String vmId, WebSocketSession session) {
        agents.put(vmId, session);
        log.info("Agent registered for VM {}", vmId);
    }

    public void unregisterAgent(String vmId) {
        agents.remove(vmId);
        frontends.remove(vmId);
        log.info("Agent unregistered for VM {}", vmId);
    }

    public boolean hasAgent(String vmId) {
        WebSocketSession session = agents.get(vmId);
        return session != null && session.isOpen();
    }

    public void removeAgentSession(WebSocketSession session) {
        agents.entrySet().removeIf(e -> e.getValue().equals(session));
        frontends.entrySet().removeIf(e -> e.getValue().equals(session));
    }

    // ── Frontend session management ──────────────────────────────────────────

    public void registerFrontend(String vmId, WebSocketSession session) {
        frontends.put(vmId, session);
    }

    public void unregisterFrontend(String vmId) {
        frontends.remove(vmId);
    }

    public void removeFrontendSession(WebSocketSession session) {
        frontends.entrySet().removeIf(e -> e.getValue().equals(session));
    }

    // ── Message forwarding ───────────────────────────────────────────────────

    public boolean forwardToAgent(String vmId, String message) {
        WebSocketSession agent = agents.get(vmId);
        if (agent == null || !agent.isOpen()) return false;
        try {
            agent.sendMessage(new TextMessage(message));
            return true;
        } catch (IOException e) {
            log.warn("Failed to forward to agent {}: {}", vmId, e.getMessage());
            return false;
        }
    }

    public boolean forwardToFrontend(String vmId, String jsonPayload) {
        WebSocketSession frontend = frontends.get(vmId);
        if (frontend == null || !frontend.isOpen()) return false;
        try {
            // Check if it's a shell_output — decode base64 and send as binary
            var node = MAPPER.readTree(jsonPayload);
            String type = node.get("type").asText();
            if ("shell_output".equals(type)) {
                String base64 = node.get("data").asText();
                byte[] raw = Base64.getDecoder().decode(base64);
                frontend.sendMessage(new BinaryMessage(raw));
            } else {
                frontend.sendMessage(new TextMessage(jsonPayload));
            }
            return true;
        } catch (Exception e) {
            log.warn("Failed to forward to frontend {}: {}", vmId, e.getMessage());
            return false;
        }
    }
}
