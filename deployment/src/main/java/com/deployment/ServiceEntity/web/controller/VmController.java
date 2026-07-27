package com.deployment.ServiceEntity.web.controller;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.core.io.FileSystemResource;
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

    public VmController(VmService service) {
        this.service = service;
    }

    // ── CRUD ──────────────────────────────────────────────────────────────────

    @PostMapping
    public ResponseEntity<VmResponse> create(@Valid @RequestBody VmRequest request) {
        UserContext.requirePermission("VM_MANAGE");
        request.setTenantId(UserContext.getTenantId());
        VmResponse response = service.create(request);
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
        return ResponseEntity.ok(service.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        UserContext.requirePermission("VM_MANAGE");
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    @PostMapping("/{id}/start")
    public ResponseEntity<VmResponse> start(@PathVariable UUID id) {
        UserContext.requirePermission("VM_MANAGE");
        return ResponseEntity.ok(service.start(id));
    }

    @PostMapping("/{id}/stop")
    public ResponseEntity<VmResponse> stop(@PathVariable UUID id) {
        UserContext.requirePermission("VM_MANAGE");
        return ResponseEntity.ok(service.stop(id));
    }

    @PostMapping("/{id}/restart")
    public ResponseEntity<VmResponse> restart(@PathVariable UUID id) {
        UserContext.requirePermission("VM_MANAGE");
        return ResponseEntity.ok(service.restart(id));
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
        return ResponseEntity.ok(service.executeSshCommand(id, request.command()));
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
        java.io.File keyFile = new java.io.File(keyPath);
        if (!keyFile.exists()) {
            return ResponseEntity.notFound().build();
        }
        FileSystemResource resource = new FileSystemResource(keyFile);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + keyFile.getName() + "\"")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .contentLength(keyFile.length())
                .body(resource);
    }
}