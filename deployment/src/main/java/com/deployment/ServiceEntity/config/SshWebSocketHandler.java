package com.deployment.ServiceEntity.config;

import java.io.InputStream;
import java.io.OutputStream;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.BinaryMessage;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import com.deployment.ServiceEntity.domain.VmClient;
import com.deployment.ServiceEntity.domain.VagrantSshConfig;
import com.deployment.ServiceEntity.domain.Vm;
import com.deployment.ServiceEntity.exception.ApiException;
import com.deployment.ServiceEntity.repository.VmRepository;

import com.jcraft.jsch.ChannelShell;
import com.jcraft.jsch.JSch;
import com.jcraft.jsch.Session;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class SshWebSocketHandler extends TextWebSocketHandler {

    private static final Logger log = LoggerFactory.getLogger(SshWebSocketHandler.class);

    private final VmRepository vmRepository;
    private final VmClient vagrantClient;
    private final AgentRegistry agentRegistry;

    private Session jschSession;
    private ChannelShell channel;
    private Thread outputThread;

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        String vmId = extractVmId(session);
        Vm vm = vmRepository.findById(UUID.fromString(vmId))
                .orElseThrow(() -> new EntityNotFoundException("VM not found: " + vmId));

        if (vm.getStatus() != Vm.Status.RUNNING) {
            session.close(CloseStatus.SERVER_ERROR);
            return;
        }

        List<String> userIdHeaders = session.getHandshakeHeaders().get("X-User-Id");
        List<String> tenantIdHeaders = session.getHandshakeHeaders().get("X-Tenant-Id");
        List<String> permissionsHeaders = session.getHandshakeHeaders().get("X-User-Permissions");
        String userId = (userIdHeaders != null && !userIdHeaders.isEmpty()) ? userIdHeaders.get(0) : null;
        String tenantId = (tenantIdHeaders != null && !tenantIdHeaders.isEmpty()) ? tenantIdHeaders.get(0) : null;

        Set<String> permissions = new HashSet<>();
        if (permissionsHeaders != null && !permissionsHeaders.isEmpty()) {
            try {
                permissions = new com.fasterxml.jackson.databind.ObjectMapper()
                        .readValue(permissionsHeaders.get(0),
                                new com.fasterxml.jackson.core.type.TypeReference<Set<String>>() {});
            } catch (Exception e) {
                log.warn("Failed to parse X-User-Permissions in WebSocket: {}", e.getMessage());
            }
        }
        if (!permissions.contains("SSH_MANAGE")) {
            log.warn("User {} tried SSH access without SSH_MANAGE permission", userId);
            session.close(CloseStatus.POLICY_VIOLATION);
            return;
        }

        if (tenantId != null && !"unknown".equals(tenantId)) {
            UUID requestTenantId = UUID.fromString(tenantId);
            if (!vm.getTenantId().equals(requestTenantId)) {
                log.warn("User {} from tenant {} tried to access VM {} from tenant {}",
                        userId, tenantId, vmId, vm.getTenantId());
                session.close(CloseStatus.POLICY_VIOLATION);
                return;
            }
        } else if (userId == null || "unknown".equals(userId)) {
            session.close(CloseStatus.POLICY_VIOLATION);
            return;
        }

        // Try agent-based connection first (Plan B)
        if (agentRegistry.hasAgent(vmId)) {
            log.info("Routing SSH for VM {} through agent", vmId);
            agentRegistry.registerFrontend(vmId, session);
            agentRegistry.forwardToAgent(vmId, "{\"type\":\"start_shell\"}");
            return;
        }

        // Fallback: Vagrant SSH
        connectViaVagrant(vm, session);
    }

    private void connectViaVagrant(Vm vm, WebSocketSession session) throws Exception {
        VagrantSshConfig sshConfig = vagrantClient.getSshConfig(vm.getVagrantPath());

        JSch jsch = new JSch();
        if (sshConfig.getPrivateKeyPath() != null && !sshConfig.getPrivateKeyPath().isBlank()) {
            jsch.addIdentity(sshConfig.getPrivateKeyPath());
        }
        jschSession = jsch.getSession(sshConfig.getUser(), sshConfig.getHost(), sshConfig.getPort());
        jschSession.setPassword("vagrant");
        jschSession.setConfig("StrictHostKeyChecking", "no");
        jschSession.setConfig("PreferredAuthentications", "publickey,keyboard-interactive,password");

        jschSession.connect(10_000);
        channel = (ChannelShell) jschSession.openChannel("shell");
        channel.setPtyType("xterm-256color", 120, 40, 0, 0);
        channel.setPty(true);

        InputStream channelIn = channel.getInputStream();
        OutputStream channelOut = channel.getOutputStream();

        channel.connect(10_000);

        session.getAttributes().put("channelOut", channelOut);

        log.info("Vagrant SSH connected to VM {} ({})", vm.getName(), sshConfig.getHost());

        outputThread = new Thread(() -> {
            try {
                byte[] buffer = new byte[8192];
                while (!Thread.currentThread().isInterrupted() && channel.isConnected() && session.isOpen()) {
                    int len = channelIn.read(buffer);
                    if (len < 0) break;
                    if (len > 0 && session.isOpen()) {
                        synchronized (session) {
                            session.sendMessage(new BinaryMessage(java.util.Arrays.copyOf(buffer, len)));
                        }
                    }
                }
            } catch (Exception e) {
                log.debug("Vagrant SSH output thread ended: {}", e.getMessage());
            }
        }, "ssh-output-" + vm.getId());
        outputThread.setDaemon(true);
        outputThread.start();
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        String payload = message.getPayload();
        String vmId = extractVmId(session);

        // Handle resize messages
        if (payload.startsWith("{") && payload.contains("\"type\":\"resize\"")) {
            if (agentRegistry.hasAgent(vmId)) {
                agentRegistry.forwardToAgent(vmId, payload);
            } else if (channel != null && channel.isConnected()) {
                try {
                    var node = new com.fasterxml.jackson.databind.ObjectMapper().readTree(payload);
                    int cols = node.get("cols").asInt(120);
                    int rows = node.get("rows").asInt(40);
                    channel.setPtySize(cols, rows, 0, 0);
                } catch (Exception e) {
                    log.debug("Resize parse error: {}", e.getMessage());
                }
            }
            return;
        }

        // Route to agent or Vagrant SSH
        if (agentRegistry.hasAgent(vmId)) {
            agentRegistry.forwardToAgent(vmId, payload);
        } else {
            OutputStream channelOut = (OutputStream) session.getAttributes().get("channelOut");
            if (channelOut != null) {
                channelOut.write(payload.getBytes());
                channelOut.flush();
            }
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        String vmId = extractVmId(session);
        if (agentRegistry.hasAgent(vmId)) {
            agentRegistry.forwardToAgent(vmId, "{\"type\":\"stop_shell\"}");
            agentRegistry.unregisterFrontend(vmId);
        }
        cleanup();
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) {
        log.error("SSH WebSocket transport error: {}", exception.getMessage());
        String vmId = extractVmId(session);
        agentRegistry.unregisterFrontend(vmId);
        cleanup();
    }

    private void cleanup() {
        try {
            if (channel != null && channel.isConnected()) {
                channel.disconnect();
            }
            if (jschSession != null && jschSession.isConnected()) {
                jschSession.disconnect();
            }
            if (outputThread != null) {
                outputThread.interrupt();
            }
        } catch (Exception e) {
            log.warn("SSH cleanup error: {}", e.getMessage());
        }
    }

    private String extractVmId(WebSocketSession session) {
        String uri = session.getUri().toString();
        String[] parts = uri.split("/");
        return parts[parts.length - 1];
    }
}
