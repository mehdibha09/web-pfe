package com.deployment.ServiceEntity.config;

import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import com.deployment.ServiceEntity.domain.Vm;
import com.deployment.ServiceEntity.repository.VmRepository;
import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class AgentWebSocketHandler extends TextWebSocketHandler {

    private static final Logger log = LoggerFactory.getLogger(AgentWebSocketHandler.class);

    private final AgentRegistry agentRegistry;
    private final VmRepository vmRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        String path = session.getUri().getPath();
        String[] parts = path.split("/");
        if (parts.length < 5) {
            session.close(CloseStatus.POLICY_VIOLATION);
            return;
        }
        String vmId = parts[3];
        String token = parts[4];

        Vm vm = vmRepository.findById(UUID.fromString(vmId))
                .orElseThrow(() -> new EntityNotFoundException("VM not found: " + vmId));

        if (!token.equals(vm.getId().toString())) {
            log.warn("Agent rejected for VM {}: invalid token", vmId);
            session.close(CloseStatus.POLICY_VIOLATION);
            return;
        }

        session.getAttributes().put("vmId", vmId);
        agentRegistry.registerAgent(vmId, session);

        session.sendMessage(new TextMessage("{\"type\":\"registered\",\"vmId\":\"" + vmId + "\"}"));
        log.info("Agent connected for VM {}", vmId);
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        String vmId = (String) session.getAttributes().get("vmId");
        if (vmId == null) return;

        agentRegistry.forwardToFrontend(vmId, message.getPayload());
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        String vmId = (String) session.getAttributes().get("vmId");
        if (vmId != null) {
            agentRegistry.unregisterAgent(vmId);
            log.info("Agent disconnected for VM {}: {}", vmId, status);
        }
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) {
        String vmId = (String) session.getAttributes().get("vmId");
        log.error("Agent transport error for VM {}: {}", vmId, exception.getMessage());
        agentRegistry.removeAgentSession(session);
    }
}
