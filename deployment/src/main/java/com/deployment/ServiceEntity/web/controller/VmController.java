package com.deployment.ServiceEntity.web.controller;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.deployment.ServiceEntity.config.UserContext;
import com.deployment.ServiceEntity.domain.Metric;
import com.deployment.ServiceEntity.domain.VagrantSshConfig;
import com.deployment.ServiceEntity.domain.VmClient;
import com.deployment.ServiceEntity.service.AuditService;
import com.deployment.ServiceEntity.service.VmService;
import com.deployment.ServiceEntity.web.dto.ssh.SshExecuteRequest;
import com.deployment.ServiceEntity.web.dto.vm.VmRequest;
import com.deployment.ServiceEntity.web.dto.vm.VmResponse;
import com.deployment.ServiceEntity.web.dto.vm.VmStatusResponse;
import com.deployment.ServiceEntity.web.routes.ApiRoutes;

import jakarta.validation.Valid;

@RestController
@RequestMapping(ApiRoutes.Vm.BASE)
public class VmController {

    private final VmService service;
    private final VmClient vmClient;
    private final AuditService auditService;

    public VmController(VmService service, VmClient vmClient, AuditService auditService) {
        this.service = service;
        this.vmClient = vmClient;
        this.auditService = auditService;
    }

    // ── CRUD ──────────────────────────────────────────────────────────────────

    @PostMapping
    public ResponseEntity<VmResponse> create(@Valid @RequestBody VmRequest request) {
        UserContext.requirePermission("VM_MANAGE");
        request.setTenantId(UserContext.getTenantId());
        VmResponse response = service.create(request);
        auditService.record("VM_CREATE", "vm", response.getId().toString(), "VM created (name='" + response.getName() + "')");
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<VmResponse> getById(@PathVariable UUID id) {
        UserContext.requirePermission("VM_READ");
        return ResponseEntity.ok(service.getById(id));
    }

    @GetMapping
    public ResponseEntity<Page<VmResponse>> getAll(@PageableDefault(size = 10) Pageable pageable) {
        UserContext.requirePermission("VM_READ");
        return ResponseEntity.ok(service.getAll(null, pageable));
    }

    @GetMapping("/service-environment/{serviceEnvironmentId}")
    public ResponseEntity<List<VmResponse>> getByServiceEnvironment(
            @PathVariable UUID serviceEnvironmentId) {
        UserContext.requirePermission("VM_READ");
        return ResponseEntity.ok(service.getByServiceEnvironment(serviceEnvironmentId));
    }

    @PutMapping("/{id}")
    public ResponseEntity<VmResponse> update(
            @PathVariable UUID id,
            @Valid @RequestBody VmRequest request) {
        UserContext.requirePermission("VM_MANAGE");
        request.setTenantId(UserContext.getTenantId());
        VmResponse updated = service.update(id, request);
        auditService.record("VM_UPDATE", "vm", updated.getId().toString(), "VM updated (name='" + updated.getName() + "')");
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        UserContext.requirePermission("VM_MANAGE");
        service.delete(id);
        auditService.record("VM_DELETE", "vm", id.toString(), "VM deleted (id=" + id + ")");
        return ResponseEntity.noContent().build();
    }

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    @PostMapping("/{id}/start")
    public ResponseEntity<VmResponse> start(@PathVariable UUID id) {
        UserContext.requirePermission("VM_MANAGE");
        VmResponse started = service.start(id);
        auditService.record("VM_START", "vm", started.getId().toString(), "VM started (name='" + started.getName() + "')");
        return ResponseEntity.ok(started);
    }

    @PostMapping("/{id}/stop")
    public ResponseEntity<VmResponse> stop(@PathVariable UUID id) {
        UserContext.requirePermission("VM_MANAGE");
        VmResponse stopped = service.stop(id);
        auditService.record("VM_STOP", "vm", stopped.getId().toString(), "VM stopped (name='" + stopped.getName() + "')");
        return ResponseEntity.ok(stopped);
    }

    @PostMapping("/{id}/restart")
    public ResponseEntity<VmResponse> restart(@PathVariable UUID id) {
        UserContext.requirePermission("VM_MANAGE");
        VmResponse restarted = service.restart(id);
        auditService.record("VM_RESTART", "vm", restarted.getId().toString(), "VM restarted (name='" + restarted.getName() + "')");
        return ResponseEntity.ok(restarted);
    }

    // ── Monitoring ────────────────────────────────────────────────────────────

    @GetMapping("/{id}/status")
    public ResponseEntity<VmStatusResponse> getStatus(@PathVariable UUID id) {
        UserContext.requirePermission("VM_READ");
        return ResponseEntity.ok(service.getStatus(id));
    }

    @GetMapping("/{id}/metrics")
    public ResponseEntity<List<Metric>> getMetrics(@PathVariable UUID id) {
        UserContext.requirePermission("VM_READ");
        return ResponseEntity.ok(service.getMetrics(id));
    }

    // ── SSH ───────────────────────────────────────────────────────────────────

    @PostMapping("/{id}/ssh/execute")
    public ResponseEntity<Map<String, Object>> sshExecute(
            @PathVariable UUID id,
            @Valid @RequestBody SshExecuteRequest request) {
        UserContext.requirePermission("SSH_MANAGE");
        Map<String, Object> result = service.executeSshCommand(id, request.command());
        auditService.record("VM_SSH_EXECUTE", "vm", id.toString(), "SSH command executed (id=" + id + ")");
        return ResponseEntity.ok(result);
    }

    @GetMapping("/{id}/ssh/info")
    public ResponseEntity<VagrantSshConfig> sshInfo(@PathVariable UUID id) {
        UserContext.requirePermission("SSH_MANAGE");
        return ResponseEntity.ok(service.getSshInfo(id));
    }

    @GetMapping("/{id}/ssh/key")
    public ResponseEntity<Resource> downloadSshKey(@PathVariable UUID id) {
        UserContext.requirePermission("SSH_MANAGE");
        VagrantSshConfig config = service.getSshInfo(id);
        String keyPath = config.getPrivateKeyPath();
        if (keyPath == null || keyPath.isBlank()) {
            return ResponseEntity.notFound().build();
        }
        try {
            String content = vmClient.readRemoteFile(keyPath);
            String filename = keyPath.replaceFirst("^.*[/\\\\]", "");
            byte[] bytes = content.getBytes(java.nio.charset.StandardCharsets.UTF_8);
            auditService.record("VM_SSH_KEY_DOWNLOAD", "vm", id.toString(),
                    "Private SSH key downloaded (vm=" + id + ")");
            ByteArrayResource resource = new ByteArrayResource(bytes);
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                    .header(HttpHeaders.CACHE_CONTROL, "no-store")
                    .header(HttpHeaders.PRAGMA, "no-cache")
                    .contentType(MediaType.APPLICATION_OCTET_STREAM)
                    .contentLength(bytes.length)
                    .body(resource);
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }
}