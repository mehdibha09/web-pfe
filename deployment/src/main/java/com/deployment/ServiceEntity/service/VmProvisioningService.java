package com.deployment.ServiceEntity.service;

import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import com.deployment.ServiceEntity.domain.VmClient;
import com.deployment.ServiceEntity.domain.VagrantSshConfig;
import com.deployment.ServiceEntity.domain.Vm;
import com.deployment.ServiceEntity.repository.VmRepository;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class VmProvisioningService {

        private static final Logger log = LoggerFactory.getLogger(VmProvisioningService.class);

        private final VmRepository vmRepository;
        private final VmClient vagrantClient;

        @Async
        public void provisionVmAsync(UUID vmId) {
                Vm vm = vmRepository.findById(vmId)
                                .orElseThrow(() -> new EntityNotFoundException("VM not found: " + vmId));

                log.info("Starting provisioning for VM: {}", vm.getName());

                try {
                        // ── 1. Créer Vagrantfile + récupérer vbName ───────────────────
                        String vbName = vagrantClient.createVagrantfile(vm);
                        vm.setVboxName(vbName);
                        vmRepository.save(vm);
                        log.info("Vagrantfile created. vbName={}", vbName);

                        // ── 2. Démarrer la VM ─────────────────────────────────────────
                        vagrantClient.up(vm.getVagrantPath());
                        log.info("VM started: {}", vm.getName());

                        // ── 3. Activer métriques VirtualBox ───────────────────────────
                        vagrantClient.setupMetrics(vbName);
                        log.info("Metrics setup for: {}", vbName);

                        // ── 4. SSH config ─────────────────────────────────────────────
                        try {
                                VagrantSshConfig ssh = vagrantClient.getSshConfig(vm.getVagrantPath());
                                vm.setIpAddress(ssh.getHost());
                                vm.setSshPort(ssh.getPort());
                                vm.setSshUser(ssh.getUser());
                        } catch (Exception e) {
                                log.warn("Could not get SSH config: {}", e.getMessage());
                        }

                        // ── 5. Status RUNNING ─────────────────────────────────────────
                        vm.setStatus(Vm.Status.RUNNING);
                        vmRepository.save(vm);
                        log.info("VM {} provisioned successfully", vm.getName());

                } catch (Exception e) {
                        log.error("Provision failed for VM {}: {}", vm.getName(), e.getMessage());
                        vm.setStatus(Vm.Status.FAILED);
                        vmRepository.save(vm);
                }
        }
}