package com.deployment.ServiceEntity.web.controller;

import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.deployment.ServiceEntity.config.UserContext;
import com.deployment.ServiceEntity.service.BackupService;
import com.deployment.ServiceEntity.web.dto.backup.BackupCreateDto;
import com.deployment.ServiceEntity.web.dto.backup.BackupResponseDto;
import com.deployment.ServiceEntity.web.routes.ApiRoutes;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping(ApiRoutes.Backup.BASE)
@RequiredArgsConstructor
public class BackupController {

    private final BackupService backupService;

    @PostMapping
    public ResponseEntity<BackupResponseDto> create(@Valid @RequestBody BackupCreateDto dto) {
        UserContext.requirePermission("BACKUP_MANAGE");
        return ResponseEntity.status(HttpStatus.CREATED).body(backupService.create(dto));
    }

    @GetMapping
    public ResponseEntity<Page<BackupResponseDto>> getAll(@PageableDefault(size = 10) Pageable pageable) {
        UserContext.requirePermission("BACKUP_READ");
        return ResponseEntity.ok(backupService.getAll(pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<BackupResponseDto> getById(@PathVariable UUID id) {
        UserContext.requirePermission("BACKUP_READ");
        return ResponseEntity.ok(backupService.getById(id));
    }

    @PostMapping("/{id}/restore")
    public ResponseEntity<BackupResponseDto> restore(@PathVariable UUID id) {
        UserContext.requirePermission("BACKUP_MANAGE");
        return ResponseEntity.ok(backupService.restore(id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        UserContext.requirePermission("BACKUP_MANAGE");
        backupService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
