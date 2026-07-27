package com.deployment.ServiceEntity.domain;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.concurrent.ConcurrentHashMap;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import com.deployment.ServiceEntity.web.dto.vm.VmMetricsSnapshot;

@Component
@ConditionalOnProperty(name = "vm.provider", havingValue = "direct-ssh")
public class DirectSshVmClient implements VmClient {

    private static final Logger log = LoggerFactory.getLogger(DirectSshVmClient.class);

    private final ConcurrentHashMap<String, String[]> sshConfigCache = new ConcurrentHashMap<>();

    private String systemPath() {
        String env = System.getenv("PATH");
        return "/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:"
                + (env != null ? env : "");
    }

    @Override
    public String getVmPath(String tenantId, String vmName) {
        return tenantId + "/" + vmName;
    }

    @Override
    public String createVagrantfile(Vm vm) {
        log.info("Direct SSH mode: no Vagrantfile needed for VM {}", vm.getName());
        return vm.getName();
    }

    private String[] resolveSshConfig(String vmPath) {
        return sshConfigCache.computeIfAbsent(vmPath, path -> {
            return new String[] { "22", "root", "" };
        });
    }

    private String execSsh(Vm vm, String command) {
        String host = vm.getIpAddress();
        int port = vm.getSshPort() != null ? vm.getSshPort() : 22;
        String user = vm.getSshUser() != null ? vm.getSshUser() : "root";

        try {
            String[] sshCmd = {
                    "ssh",
                    "-o", "StrictHostKeyChecking=no",
                    "-o", "UserKnownHostsFile=/dev/null",
                    "-o", "ConnectTimeout=5",
                    "-o", "LogLevel=QUIET",
                    "-p", String.valueOf(port),
                    user + "@" + host,
                    command
            };

            ProcessBuilder pb = new ProcessBuilder(sshCmd);
            pb.redirectErrorStream(true);
            pb.environment().put("PATH", systemPath());

            Process process = pb.start();
            String output = new String(process.getInputStream().readAllBytes());
            int exitCode = process.waitFor();

            log.info("ssh [{}@{}] exit={}", user, host, exitCode);
            if (exitCode != 0) {
                throw new RuntimeException("SSH command failed (exit=" + exitCode + "): " + output);
            }
            return output;

        } catch (IOException | InterruptedException e) {
            throw new RuntimeException("Failed to SSH [" + user + "@" + host + "]: " + e.getMessage());
        }
    }

    private void execSshIgnoreError(Vm vm, String command) {
        try {
            execSsh(vm, command);
        } catch (Exception e) {
            log.warn("SSH command ignored error: {}", e.getMessage());
        }
    }

    @Override
    public void up(String vmPath) {
        log.info("Direct SSH mode: VM at {} is managed externally, no action needed", vmPath);
    }

    @Override
    public void halt(String vmPath) {
        log.info("Direct SSH mode: cannot halt externally managed VM at {}", vmPath);
    }

    @Override
    public void reload(String vmPath) {
        log.info("Direct SSH mode: cannot reload externally managed VM at {}", vmPath);
    }

    @Override
    public void destroy(String vmPath) {
        log.info("Direct SSH mode: cannot destroy externally managed VM at {}", vmPath);
    }

    @Override
    public String status(String vmPath) {
        return "unknown";
    }

    public String status(Vm vm) {
        try {
            execSsh(vm, "uptime");
            return "running";
        } catch (Exception e) {
            log.warn("VM {} not reachable: {}", vm.getName(), e.getMessage());
            return "stopped";
        }
    }

    @Override
    public VagrantSshConfig getSshConfig(String vmPath) {
        VagrantSshConfig config = new VagrantSshConfig();
        config.setHost("127.0.0.1");
        config.setPort(22);
        config.setUser("root");
        return config;
    }

    public VagrantSshConfig getSshConfig(Vm vm) {
        VagrantSshConfig config = new VagrantSshConfig();
        config.setHost(vm.getIpAddress() != null ? vm.getIpAddress() : "127.0.0.1");
        config.setPort(vm.getSshPort() != null ? vm.getSshPort() : 22);
        config.setUser(vm.getSshUser() != null ? vm.getSshUser() : "root");
        return config;
    }

    @Override
    public void setupMetrics(String vmIdentifier) {
        log.info("Direct SSH mode: metrics collected via system commands, no VBoxManage needed");
    }

    @Override
    public VmMetricsSnapshot queryMetrics(String vmIdentifier) {
        log.info("Direct SSH mode: metrics by vmPath not supported, use queryMetrics(Vm) instead");
        return null;
    }

    public VmMetricsSnapshot queryMetrics(Vm vm) {
        VmMetricsSnapshot snapshot = new VmMetricsSnapshot();
        try {
            String cpuOutput = execSsh(vm, "top -bn1 | grep 'Cpu(s)' | awk '{print $2}' | cut -d'%' -f1");
            try {
                snapshot.setCpuUsage(Float.parseFloat(cpuOutput.trim()));
            } catch (NumberFormatException e) {
                snapshot.setCpuUsage(0);
            }

            String memOutput = execSsh(vm, "free | grep Mem | awk '{print $3}'");
            try {
                snapshot.setRamUsageKb(Double.parseDouble(memOutput.trim()));
            } catch (NumberFormatException e) {
                snapshot.setRamUsageKb(0);
            }

            String diskOutput = execSsh(vm, "df / | tail -1 | awk '{print $3}'");
            try {
                double diskKb = Double.parseDouble(diskOutput.trim());
                snapshot.setDiskUsageMb(diskKb / 1024.0);
            } catch (NumberFormatException e) {
                snapshot.setDiskUsageMb(0);
            }

            snapshot.setNetworkRateBps(0);
        } catch (Exception e) {
            log.warn("Failed to collect metrics for {}: {}", vm.getName(), e.getMessage());
        }
        return snapshot;
    }

    @Override
    public String executeCommand(String vmPath, String command) {
        log.info("Direct SSH mode: executeCommand by vmPath not supported, use executeCommand(Vm, String) instead");
        throw new UnsupportedOperationException("Use executeCommand(Vm, String) in direct SSH mode");
    }

    public String executeCommand(Vm vm, String command) {
        return execSsh(vm, command);
    }

    @Override
    public void invalidateSshConfigCache(String vmPath) {
        sshConfigCache.remove(vmPath);
    }

    @Override
    public void takeSnapshot(String vmIdentifier, String snapshotName) {
        log.info("Direct SSH mode: snapshots not supported for externally managed VM {}", vmIdentifier);
    }

    @Override
    public void restoreSnapshot(String vmIdentifier, String snapshotName) {
        log.info("Direct SSH mode: snapshots not supported for externally managed VM {}", vmIdentifier);
    }

    @Override
    public void deleteSnapshot(String vmIdentifier, String snapshotName) {
        log.info("Direct SSH mode: snapshots not supported for externally managed VM {}", vmIdentifier);
    }

    @Override
    public long getSnapshotSizeMb(String vmIdentifier) {
        return 0L;
    }
}
