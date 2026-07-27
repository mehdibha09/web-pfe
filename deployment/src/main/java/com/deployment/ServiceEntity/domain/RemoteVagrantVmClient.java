package com.deployment.ServiceEntity.domain;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import com.deployment.ServiceEntity.web.dto.vm.VmMetricsSnapshot;

import jakarta.annotation.PostConstruct;

@Component
@ConditionalOnProperty(name = "vm.provider", havingValue = "remote-vagrant")
public class RemoteVagrantVmClient implements VmClient {

    private static final Logger log = LoggerFactory.getLogger(RemoteVagrantVmClient.class);

    @Value("${vm.host.host:192.168.56.1}")
    private String host;

    @Value("${vm.host.port:22}")
    private int port;

    @Value("${vm.host.user:mehdi}")
    private String user;

    @Value("${vm.host.key-path:}")
    private String keyPath;

    @Value("${vagrant.base-dir:./vms}")
    private String baseDir;

    private String sshOpts;

    @PostConstruct
    void init() {
        String keyOpt = keyPath != null && !keyPath.isBlank()
                ? "-i " + keyPath
                : "";
        sshOpts = String.format(
                "-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=10 -p %d %s",
                port, keyOpt);
        log.info("Remote Vagrant host: {}@{}:{}, baseDir={}", user, host, port, baseDir);
    }

    private String ssh(String command) {
        try {
            String[] cmd = {
                    "ssh", "-o", "StrictHostKeyChecking=no", "-o", "UserKnownHostsFile=/dev/null",
                    "-o", "ConnectTimeout=10", "-p", String.valueOf(port),
                    user + "@" + host, command
            };

            ProcessBuilder pb = new ProcessBuilder(cmd);
            pb.redirectErrorStream(true);
            Process process = pb.start();
            String output = new String(process.getInputStream().readAllBytes());
            int exitCode = process.waitFor();

            if (exitCode != 0) {
                throw new RuntimeException("Remote command failed (exit=" + exitCode + "): " + output);
            }
            return output;

        } catch (IOException | InterruptedException e) {
            throw new RuntimeException("SSH to host [" + user + "@" + host + "] failed: " + e.getMessage());
        }
    }

    private String sshVagrant(String vmPath, String... vagrantArgs) {
        String args = String.join(" ", vagrantArgs);
        String cmd = String.format(
                "cd %s && vagrant %s --no-color 2>&1", vmPath, args);
        log.info("remote vagrant: {}", cmd);
        return ssh(cmd);
    }

    private String sshVbox(String vboxCmd) {
        String cmd = "VBoxManage " + vboxCmd + " 2>&1";
        log.info("remote VBoxManage: {}", cmd);
        return ssh(cmd);
    }

    @Override
    public String getVmPath(String tenantId, String vmName) {
        return baseDir + "/" + tenantId + "/" + vmName;
    }

    @Override
    public String createVagrantfile(Vm vm) {
        String vmPath = vm.getVagrantPath();
        String networkName = "tenant-" + vm.getTenantId().toString().substring(0, 8);
        String ip = generateIp(vm);

        String vagrantfile = String.format(
                "Vagrant.configure(\"2\") do |config|\n" +
                "  config.vm.box      = \"%s\"\n" +
                "  config.vm.hostname = \"%s\"\n" +
                "  config.vbguest.auto_update = false\n" +
                "  config.vm.network \"private_network\", ip: \"%s\", virtualbox__intnet: \"%s\"\n" +
                "  config.vm.provider \"virtualbox\" do |vb|\n" +
                "    vb.name   = \"%s\"\n" +
                "    vb.memory = %d\n" +
                "    vb.cpus   = %d\n" +
                "    vb.customize [\"modifyvm\", :id, \"--vram\", \"16\"]\n" +
                "  end\n" +
                "  config.vm.provision \"shell\", inline: <<-SHELL\n" +
                "    apt-get update -y\n" +
                "    apt-get install -y curl wget htop net-tools sysstat\n" +
                "    echo \"VM %s ready\"\n" +
                "  SHELL\n" +
                "end\n",
                vm.getOs().getVagrantBox(), vm.getName(), ip, networkName,
                vm.getName(), vm.getRam(), vm.getCpu(), vm.getName());

        ssh("mkdir -p " + vmPath);
        ssh("cat > " + vmPath + "/Vagrantfile << 'VAGRANTFILE'\n" + vagrantfile + "\nVAGRANTFILE");

        log.info("Remote Vagrantfile created at {}:{}", host, vmPath);
        return vm.getName();
    }

    private String generateIp(Vm vm) {
        int x = Math.abs(vm.getTenantId().hashCode()) % 254 + 1;
        int y = Math.abs(vm.getId().hashCode()) % 254 + 1;
        return "192.168." + x + "." + y;
    }

    @Override
    public void up(String vmPath) {
        sshVagrant(vmPath, "up");
    }

    @Override
    public void halt(String vmPath) {
        sshVagrant(vmPath, "halt");
    }

    @Override
    public void reload(String vmPath) {
        sshVagrant(vmPath, "reload");
    }

    @Override
    public void destroy(String vmPath) {
        try {
            sshVagrant(vmPath, "destroy", "--force");
        } catch (Exception e) {
            log.warn("Remote destroy failed: {}", e.getMessage());
        }
        try {
            ssh("rm -rf " + vmPath);
        } catch (Exception e) {
            log.warn("Failed to clean up remote VM dir: {}", e.getMessage());
        }
    }

    @Override
    public String status(String vmPath) {
        try {
            String output = sshVagrant(vmPath, "status");
            if (output.contains("running")) return "running";
            if (output.contains("poweroff")) return "poweroff";
            if (output.contains("not created")) return "not_created";
            if (output.contains("aborted")) return "aborted";
            if (output.contains("saved")) return "stopped";
            return "unknown";
        } catch (Exception e) {
            log.warn("Failed to get remote VM status: {}", e.getMessage());
            return "unknown";
        }
    }

    @Override
    public VagrantSshConfig getSshConfig(String vmPath) {
        String output = sshVagrant(vmPath, "ssh-config");
        VagrantSshConfig config = new VagrantSshConfig();
        for (String line : output.split("\n")) {
            line = line.trim();
            if (line.startsWith("HostName ")) config.setHost(line.split("\\s+")[1]);
            if (line.startsWith("Port ")) config.setPort(Integer.parseInt(line.split("\\s+")[1]));
            if (line.startsWith("User ") && !line.startsWith("UserKnown"))
                config.setUser(line.split("\\s+")[1]);
            if (line.startsWith("IdentityFile "))
                config.setPrivateKeyPath(line.split("\\s+")[1]);
        }
        return config;
    }

    @Override
    public void setupMetrics(String vbName) {
        try {
            sshVbox("metrics setup --period 5 --samples 10 " + vbName + " CPU/Load/User,RAM/Usage/Used,Disk/Usage/Used,Net/Rate/Rx,Net/Rate/Tx");
        } catch (Exception e) {
            log.warn("Failed to setup remote metrics: {}", e.getMessage());
        }
    }

    @Override
    public VmMetricsSnapshot queryMetrics(String vbName) {
        VmMetricsSnapshot snapshot = new VmMetricsSnapshot();
        try {
            String output = sshVbox("metrics collect --period 1 --samples 1 " + vbName + " CPU/Load/User,RAM/Usage/Used,Disk/Usage/Used,Net/Rate/Rx,Net/Rate/Tx");
            parseMetricsOutput(output, snapshot);
        } catch (Exception e) {
            log.warn("Failed to query remote metrics: {}", e.getMessage());
        }
        return snapshot;
    }

    private void parseMetricsOutput(String output, VmMetricsSnapshot snapshot) {
        double netRx = 0, netTx = 0;
        for (String line : output.split("\n")) {
            line = line.trim();
            if (line.isEmpty() || line.startsWith("Time") || line.startsWith("---")) continue;
            String[] parts = line.split("\\s+");
            if (parts.length < 4) continue;
            String valueStr = parts[3].replaceAll("[^0-9.]", "");
            if (valueStr.isEmpty()) continue;
            try {
                double value = Double.parseDouble(valueStr);
                switch (parts[2]) {
                    case "CPU/Load/User" -> snapshot.setCpuUsage((float) value);
                    case "RAM/Usage/Used" -> snapshot.setRamUsageKb(value);
                    case "Disk/Usage/Used" -> snapshot.setDiskUsageMb(value);
                    case "Net/Rate/Rx" -> netRx = value;
                    case "Net/Rate/Tx" -> netTx = value;
                }
            } catch (NumberFormatException ignored) {}
        }
        snapshot.setNetworkRateBps(netRx + netTx);
    }

    @Override
    public String executeCommand(String vmPath, String command) {
        VagrantSshConfig cfg = getSshConfig(vmPath);
        try {
            String[] sshCmd = {
                    "ssh", "-o", "StrictHostKeyChecking=no", "-o", "UserKnownHostsFile=/dev/null",
                    "-o", "ConnectTimeout=5", "-p", String.valueOf(cfg.getPort()),
                    "-i", cfg.getPrivateKeyPath(), cfg.getUser() + "@" + cfg.getHost(), command
            };
            ProcessBuilder pb = new ProcessBuilder(sshCmd);
            pb.redirectErrorStream(true);
            Process process = pb.start();
            String output = new String(process.getInputStream().readAllBytes());
            int exitCode = process.waitFor();
            if (exitCode != 0) throw new RuntimeException("Remote SSH command failed: " + output);
            return output;
        } catch (IOException | InterruptedException e) {
            throw new RuntimeException("Failed to execute remote SSH command: " + e.getMessage());
        }
    }

    @Override
    public void invalidateSshConfigCache(String vmPath) {}

    @Override
    public void takeSnapshot(String vbName, String snapshotName) {
        sshVbox("snapshot " + vbName + " take " + snapshotName + " --description \"Backup: " + snapshotName + "\"");
    }

    @Override
    public void restoreSnapshot(String vbName, String snapshotName) {
        sshVbox("snapshot " + vbName + " restore " + snapshotName);
    }

    @Override
    public void deleteSnapshot(String vbName, String snapshotName) {
        try {
            sshVbox("snapshot " + vbName + " delete " + snapshotName);
        } catch (Exception e) {
            log.warn("Remote snapshot delete failed: {}", e.getMessage());
        }
    }

    @Override
    public long getSnapshotSizeMb(String vbName) {
        try {
            String output = sshVbox("showvminfo " + vbName + " --machinereadable");
            String snapshotFolder = null;
            for (String line : output.split("\n")) {
                if (line.startsWith("\"SnapshotFolder\"")) {
                    snapshotFolder = line.split("=", 2)[1].replaceAll("\"", "").trim();
                }
            }
            if (snapshotFolder == null) return 0L;
            String sizeOutput = ssh("du -sb " + snapshotFolder + " | cut -f1");
            long bytes = Long.parseLong(sizeOutput.trim());
            return bytes / (1024L * 1024L);
        } catch (Exception e) {
            log.warn("Failed to get remote snapshot size: {}", e.getMessage());
            return 0L;
        }
    }
}
