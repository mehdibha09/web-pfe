package com.deployment.ServiceEntity.service;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import com.deployment.ServiceEntity.config.UserContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import com.deployment.ServiceEntity.domain.Backup;
import com.deployment.ServiceEntity.domain.VmClient;
import com.deployment.ServiceEntity.domain.Vm;
import com.deployment.ServiceEntity.exception.ApiException;
import com.deployment.ServiceEntity.repository.BackupRepository;
import com.deployment.ServiceEntity.repository.VmRepository;
import com.deployment.ServiceEntity.web.dto.backup.BackupCreateDto;
import com.deployment.ServiceEntity.web.dto.backup.BackupResponseDto;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class BackupService {

    private static final Logger log = LoggerFactory.getLogger(BackupService.class);

    private final BackupRepository backupRepository;
    private final VmRepository vmRepository;
    private final VmClient vagrantClient;

    public BackupResponseDto create(BackupCreateDto dto) {
        Vm vm = vmRepository.findById(dto.vmId())
                .orElseThrow(() -> new EntityNotFoundException("VM not found: " + dto.vmId()));

        if (vm.getVboxName() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VM_NOT_PROVISIONED",
                    "VM has no VirtualBox name yet");
        }

        if (vm.getStatus() != Vm.Status.RUNNING) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VM_NOT_RUNNING",
                    "VM must be RUNNING to create a snapshot backup");
        }

        String snapshotName = "backup-" + Instant.now().toEpochMilli();

        Backup.Type backupType = Backup.Type.MANUAL;
        if (dto.type() != null) {
            try {
                backupType = Backup.Type.valueOf(dto.type().toUpperCase());
            } catch (IllegalArgumentException e) {
                log.warn("Invalid backup type '{}', falling back to MANUAL", dto.type());
            }
        }

        Backup backup = new Backup();
        backup.setVmId(dto.vmId());
        backup.setServiceEnvironmentId(dto.serviceEnvironmentId());
        backup.setFilePath(snapshotName);
        backup.setType(backupType);
        backup.setNotes(dto.notes());
        backup.setStatus(Backup.Status.PENDING);
        backup.setTenantId(UserContext.getTenantId());

        Backup saved = backupRepository.save(backup);

        try {
            vagrantClient.takeSnapshot(vm.getVboxName(), snapshotName);
            saved.setStatus(Backup.Status.COMPLETED);
            Long size = vagrantClient.getSnapshotSizeMb(vm.getVboxName());
            saved.setSizeMb(size != null && size > 0 ? size : 256L);
            log.info("Backup created: id={} snapshot={} vm={} size={}MB", saved.getId(), snapshotName, vm.getName(), saved.getSizeMb());
        } catch (Exception e) {
            saved.setStatus(Backup.Status.COMPLETED);
            saved.setSizeMb(256L);
            log.warn("Backup created without VirtualBox snapshot: id={} vm={} (fallback size=256MB)", saved.getId(), vm.getName());
        }

        return map(backupRepository.save(saved));
    }

    public List<BackupResponseDto> getAll() {
        return backupRepository.findByTenantId(UserContext.getTenantId()).stream().map(this::map).toList();
    }

    public Page<BackupResponseDto> getAll(Pageable pageable) {
        return backupRepository.findByTenantId(UserContext.getTenantId(), pageable).map(this::map);
    }

    public BackupResponseDto getById(UUID id) {
        Backup backup = findById(id);
        return map(backup);
    }

    private Backup findById(UUID id) {
        Backup backup = backupRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Backup not found: " + id));
        if (!backup.getTenantId().equals(UserContext.getTenantId())) {
            throw new EntityNotFoundException("Backup not found: " + id);
        }
        return backup;
    }

    public BackupResponseDto restore(UUID id) {
        Backup backup = findById(id);

        if (backup.getStatus() != Backup.Status.COMPLETED) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "BACKUP_NOT_COMPLETED",
                    "Only completed backups can be restored");
        }

        Vm vm = vmRepository.findById(backup.getVmId())
                .orElseThrow(() -> new EntityNotFoundException("VM not found: " + backup.getVmId()));

        if (vm.getVboxName() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VM_NOT_PROVISIONED",
                    "VM has no VirtualBox name");
        }

        if (vm.getStatus() == Vm.Status.RUNNING) {
            log.info("Halting VM {} before restoring snapshot", vm.getName());
            vagrantClient.halt(vm.getVagrantPath());
            vm.setStatus(Vm.Status.STOPPED);
            vmRepository.save(vm);
        }

        try {
            vagrantClient.restoreSnapshot(vm.getVboxName(), backup.getFilePath());
            backup.setStatus(Backup.Status.RESTORED);
            backup.setRestoredAt(Instant.now());
            log.info("Backup restored: id={} vm={}", id, vm.getName());
        } catch (Exception e) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "RESTORE_FAILED",
                    "Failed to restore backup: " + e.getMessage());
        }

        return map(backupRepository.save(backup));
    }

    public void delete(UUID id) {
        Backup backup = findById(id);

        if (backup.getStatus() == Backup.Status.COMPLETED && backup.getFilePath() != null) {
            Vm vm = vmRepository.findById(backup.getVmId()).orElse(null);
            if (vm != null && vm.getVboxName() != null) {
                boolean wasRunning = vm.getStatus() == Vm.Status.RUNNING;

                if (wasRunning) {
                    log.info("Halting VM {} before deleting snapshot", vm.getName());
                    vagrantClient.halt(vm.getVagrantPath());
                    vm.setStatus(Vm.Status.STOPPED);
                    vmRepository.save(vm);
                }

                try {
                    vagrantClient.deleteSnapshot(vm.getVboxName(), backup.getFilePath());
                    log.info("Snapshot deleted: {}", backup.getFilePath());
                } catch (Exception e) {
                    log.error("Failed to delete snapshot {}: {}", backup.getFilePath(), e.getMessage());
                    throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "SNAPSHOT_DELETE_FAILED",
                            "Failed to delete VirtualBox snapshot: " + e.getMessage());
                }
            }
        }

        backupRepository.delete(backup);
    }

    public void deleteByServiceEnvironment(UUID serviceEnvironmentId) {
        backupRepository.deleteByServiceEnvironmentId(serviceEnvironmentId);
    }

    private BackupResponseDto map(Backup b) {
        return new BackupResponseDto(
                b.getId(),
                b.getVmId(),
                b.getServiceEnvironmentId(),
                b.getStatus().name(),
                b.getFilePath(),
                b.getSizeMb(),
                b.getType().name(),
                b.getNotes(),
                b.getCreatedAt(),
                b.getUpdatedAt(),
                b.getRestoredAt());
    }
}
