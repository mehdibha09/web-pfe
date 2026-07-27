package com.deployment.ServiceEntity.service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import com.deployment.ServiceEntity.domain.Backup;
import com.deployment.ServiceEntity.domain.VmClient;
import com.deployment.ServiceEntity.domain.Vm;
import com.deployment.ServiceEntity.repository.BackupRepository;
import com.deployment.ServiceEntity.repository.VmRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class BackupSchedulerService {

    private static final Logger log = LoggerFactory.getLogger(BackupSchedulerService.class);

    private final BackupRepository backupRepository;
    private final VmRepository vmRepository;
    private final VmClient vagrantClient;

    @Value("${backup.scheduler.retention-days:30}")
    private int retentionDays;

    @Scheduled(cron = "${backup.scheduler.cron:0 0 2 * * ?}")
    public void runScheduledBackups() {
        log.info("Running scheduled backups");
        List<Vm> runningVms = vmRepository.findByStatus(Vm.Status.RUNNING);
        for (Vm vm : runningVms) {
            try {
                createScheduledBackup(vm);
            } catch (Exception e) {
                log.error("Scheduled backup failed for VM {}: {}", vm.getName(), e.getMessage());
            }
        }
        cleanupOldBackups();
    }

    private void createScheduledBackup(Vm vm) {
        if (vm.getVboxName() == null) {
            log.warn("VM {} has no vbox name, skipping scheduled backup", vm.getName());
            return;
        }
        String snapshotName = "auto-backup-" + Instant.now().toEpochMilli();
        Backup backup = new Backup();
        backup.setVmId(vm.getId());
        backup.setServiceEnvironmentId(vm.getServiceEnvironmentId());
        backup.setFilePath(snapshotName);
        backup.setType(Backup.Type.AUTOMATIC);
        backup.setStatus(Backup.Status.PENDING);
        backup.setTenantId(vm.getTenantId());
        backup.setNotes("Automated scheduled backup");
        Backup saved = backupRepository.save(backup);
        try {
            vagrantClient.takeSnapshot(vm.getVboxName(), snapshotName);
            saved.setStatus(Backup.Status.COMPLETED);
            saved.setSizeMb(vagrantClient.getSnapshotSizeMb(vm.getVboxName()));
            log.info("Scheduled backup created: id={} vm={} size={}MB", saved.getId(), vm.getName(), saved.getSizeMb());
        } catch (Exception e) {
            saved.setStatus(Backup.Status.FAILED);
            log.error("Scheduled backup failed for VM {}: {}", vm.getName(), e.getMessage());
        }
        backupRepository.save(saved);
    }

    private void cleanupOldBackups() {
        Instant cutoff = Instant.now().minus(retentionDays, ChronoUnit.DAYS);
        List<Backup> oldBackups = backupRepository.findAll().stream()
                .filter(b -> b.getCreatedAt().isBefore(cutoff))
                .toList();
        for (Backup backup : oldBackups) {
            try {
                if (backup.getFilePath() != null) {
                    Vm vm = vmRepository.findById(backup.getVmId()).orElse(null);
                    if (vm != null && vm.getVboxName() != null) {
                        vagrantClient.deleteSnapshot(vm.getVboxName(), backup.getFilePath());
                    }
                }
                backupRepository.delete(backup);
                log.info("Deleted expired backup id={} created={}", backup.getId(), backup.getCreatedAt());
            } catch (Exception e) {
                log.warn("Failed to delete expired backup {}: {}", backup.getId(), e.getMessage());
            }
        }
        if (!oldBackups.isEmpty()) {
            log.info("Retention cleanup: removed {} expired backups (>{})", oldBackups.size(), retentionDays);
        }
    }
}
