package com.deployment.ServiceEntity.service;

import java.util.List;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import com.deployment.ServiceEntity.domain.VmClient;
import com.deployment.ServiceEntity.domain.Vm;
import com.deployment.ServiceEntity.repository.VmRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
@Order(1)
@RequiredArgsConstructor
public class VmStatusSyncService implements ApplicationRunner {

    private final VmRepository vmRepository;
    private final VmClient vagrantClient;

    @Override
    public void run(ApplicationArguments args) {
        List<Vm> allVms = vmRepository.findAll();
        if (allVms.isEmpty()) {
            log.info("No VMs to sync on startup");
            return;
        }

        log.info("Syncing status for {} VM(s) on startup...", allVms.size());

        int synced = 0;
        for (Vm vm : allVms) {
            if (vm.getVagrantPath() == null) {
                log.debug("Skipping VM {} — no vagrantPath", vm.getName());
                continue;
            }

            try {
                String rawStatus = vagrantClient.status(vm.getVagrantPath());
                Vm.Status dbStatus = vm.getStatus();
                boolean mismatch = isMismatch(dbStatus, rawStatus);

                if (!mismatch) {
                    log.debug("VM {} — DB '{}' matches Vagrant '{}', OK",
                            vm.getName(), dbStatus, rawStatus);
                    continue;
                }

                log.warn("VM {} — DB '{}' but Vagrant '{}', syncing...",
                        vm.getName(), dbStatus, rawStatus);

                boolean isDownInVagrant = "poweroff".equals(rawStatus) || "aborted".equals(rawStatus) || "not_created".equals(rawStatus);

                switch (dbStatus) {
                    case RUNNING -> {
                        if (isDownInVagrant) {
                            log.warn("VM {} — Vagrant is '{}' but DB says RUNNING, updating DB to STOPPED", vm.getName(), rawStatus);
                            vm.setStatus(Vm.Status.STOPPED);
                            vmRepository.save(vm);
                            synced++;
                            continue;
                        }
                        vagrantClient.up(vm.getVagrantPath());
                    }
                    case STOPPED -> {
                        if (!isDownInVagrant) {
                            vagrantClient.halt(vm.getVagrantPath());
                        } else {
                            log.debug("VM {} — already down, nothing to sync", vm.getName());
                        }
                    }
                    case TERMINATED -> vagrantClient.destroy(vm.getVagrantPath());
                    default -> { log.warn("VM {} — DB status {}, nothing to sync", vm.getName(), dbStatus); continue; }
                }

                synced++;
                log.info("VM {} — synced to DB status '{}'", vm.getName(), dbStatus);
            } catch (Exception e) {
                log.error("VM {} — sync failed: {}", vm.getName(), e.getMessage());
            }
        }

        log.info("VM status sync complete: {}/{} synced", synced, allVms.size());
    }

    private boolean isMismatch(Vm.Status dbStatus, String rawStatus) {
        return switch (dbStatus) {
            case RUNNING -> !"running".equals(rawStatus);
            case STOPPED -> !("poweroff".equals(rawStatus) || "aborted".equals(rawStatus) || "stopped".equals(rawStatus));
            case TERMINATED -> !"not_created".equals(rawStatus);
            default -> true;
        };
    }
}
