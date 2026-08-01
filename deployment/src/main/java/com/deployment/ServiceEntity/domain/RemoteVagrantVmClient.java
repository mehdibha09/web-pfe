package com.deployment.ServiceEntity.domain;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.concurrent.TimeUnit;

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
        return ssh(command, 0, true);
    }

    private String ssh(String command, long timeoutSeconds) {
        return ssh(command, timeoutSeconds, true);
    }

    private String ssh(String command, long timeoutSeconds, boolean throwOnError) {
        try {
            String[] base = {
                    "ssh", "-o", "StrictHostKeyChecking=no", "-o", "UserKnownHostsFile=/dev/null",
                    "-o", "LogLevel=ERROR", "-o", "ConnectTimeout=10", "-p", String.valueOf(port),
            };
            java.util.ArrayList<String> cmd = new java.util.ArrayList<>(java.util.List.of(base));
            if (keyPath != null && !keyPath.isBlank()) {
                cmd.add("-i");
                cmd.add(keyPath);
            }
            cmd.add(user + "@" + host);
            cmd.add(command);

            ProcessBuilder pb = new ProcessBuilder(cmd);
            pb.redirectErrorStream(true);
            Process process = pb.start();

            boolean finished;
            if (timeoutSeconds > 0) {
                finished = process.waitFor(timeoutSeconds, TimeUnit.SECONDS);
            } else {
                process.waitFor();
                finished = true;
            }

            if (!finished) {
                process.destroyForcibly();
                throw new RuntimeException("Remote command timed out after " + timeoutSeconds + "s: " + command);
            }

            String output = new String(process.getInputStream().readAllBytes());
            int exitCode = process.exitValue();

            if (exitCode != 0 && throwOnError) {
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
        String vbName = vm.getName();
        String networkName = "tenant-" + vm.getTenantId().toString().substring(0, 8);
        String ip = generateIp(vm);

        String vmId = vm.getId().toString();
        String backendUrl = System.getenv("AGENT_BACKEND_URL");
        if (backendUrl == null || backendUrl.isBlank()) {
            backendUrl = "ws://10.10.226.124:8082";
            log.warn("AGENT_BACKEND_URL not set, using default: {}", backendUrl);
        }

        String vagrantfile = String.format("""
                Vagrant.configure("2") do |config|
                  config.vm.box      = "%s"
                  config.vm.hostname = "%s"

                  config.vbguest.auto_update = false

                  config.vm.network "private_network",
                    ip: "%s",
                    virtualbox__intnet: "%s"

                  config.vm.provider "virtualbox" do |vb|
                    vb.name   = "%s"
                    vb.memory = %d
                    vb.cpus   = %d
                    vb.customize ["modifyvm", :id, "--vram", "16"]
                  end

                  $agent_script = <<-AGENT
                    # Install Node.js
                    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
                    apt-get install -y nodejs

                    mkdir -p /opt/vm-agent

                    cat > /opt/vm-agent/package.json <<'PKG'
                {"name":"vm-agent","version":"1.0.0","dependencies":{"ws":"^8.16.0"}}
                PKG

                    cat > /opt/vm-agent/agent.js <<'SCRIPT'
                const WebSocket = require('ws');
                const {spawn} = require('child_process');
                const BACKEND = process.env.BACKEND_WS_URL || '%s';
                const VM_ID = process.env.VM_ID || '%s';
                const VM_TOKEN = process.env.VM_TOKEN || '%s';
                let ws, shell;
                function connect(){
                  const u=BACKEND+'/ws/agent/'+VM_ID+'/'+VM_TOKEN;
                  ws=new WebSocket(u);
                  ws.on('open',()=>console.log('Agent connected'));
                  ws.on('message',d=>{
                    try{
                      const m=JSON.parse(d.toString());
                      if(m.type==='start_shell'&&!shell){startShell()}
                      else if(m.type==='stop_shell'&&shell){stopShell()}
                      else if(shell&&shell.stdin.writable){shell.stdin.write(m)}
                    }catch(e){}
                  });
                  ws.on('close',()=>{stopShell();setTimeout(connect,5000)});
                  ws.on('error',()=>ws.close());
                }
                function startShell(){
                  shell=spawn('/bin/bash',[],{stdio:['pipe','pipe','pipe'],env:{...process.env,TERM:'xterm-256color'}});
                  shell.stdout.on('data',d=>ws.send(JSON.stringify({type:'shell_output',data:d.toString('base64')})));
                  shell.stderr.on('data',d=>ws.send(JSON.stringify({type:'shell_output',data:d.toString('base64')})));
                  shell.on('exit',()=>{shell=null});
                }
                function stopShell(){if(shell){shell.kill('SIGTERM');shell=null}}
                connect();
                SCRIPT

                    cd /opt/vm-agent && npm install --production

                    cat > /etc/systemd/system/vm-agent.service <<'SVC'
                [Unit]
                Description=VM Agent for PFE Platform
                After=network.target
                [Service]
                ExecStart=/usr/bin/node /opt/vm-agent/agent.js
                Environment=BACKEND_WS_URL=%s
                Environment=VM_ID=%s
                Environment=VM_TOKEN=%s
                Restart=always
                RestartSec=10
                [Install]
                WantedBy=multi-user.target
                SVC

                    systemctl daemon-reload
                    systemctl enable vm-agent
                    systemctl start vm-agent
                    echo "VM Agent installed and started"
                  AGENT

                  config.vm.provision "shell", inline: $agent_script
                end
                """,
                vm.getOs().getVagrantBox(),
                vm.getName(),
                ip,
                networkName,
                vbName,
                vm.getRam(),
                vm.getCpu(),
                backendUrl,
                vmId,
                vmId,
                backendUrl,
                vmId,
                vmId);

        ssh("mkdir -p " + vmPath);
        ssh("cat > " + vmPath + "/Vagrantfile << 'VAGRANTFILE'\n" + vagrantfile + "\nVAGRANTFILE");

        log.info("Remote Vagrantfile created at {}:{}", host, vmPath);
        return vbName;
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
            ssh("timeout 10 VBoxManage metrics setup --period 5 --samples 10 " + vbName + " CPU/Load/User,RAM/Usage/Used,Disk/Usage/Used,Net/Rate/Rx,Net/Rate/Tx 2>&1", 15);
        } catch (Exception e) {
            log.warn("Failed to setup remote metrics: {}", e.getMessage());
        }
    }

    @Override
    public VmMetricsSnapshot queryMetrics(String vbName) {
        VmMetricsSnapshot snapshot = new VmMetricsSnapshot();
        try {
            setupMetrics(vbName);
            String cmd = "timeout 5 VBoxManage metrics collect --period 1 --samples 1 " + vbName + " CPU/Load/User,RAM/Usage/Used,Disk/Usage/Used,Net/Rate/Rx,Net/Rate/Tx 2>&1";
            String output = ssh(cmd, 15, false);
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
    public String readRemoteFile(String filePath) {
        String cmd = "cat " + filePath + " 2>&1";
        log.info("remote read file: {}", cmd);
        return ssh(cmd);
    }

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
                if (line.startsWith("SnapFldr=")) {
                    snapshotFolder = line.split("=", 2)[1].replaceAll("\"", "").trim();
                }
            }
            if (snapshotFolder == null) return 0L;
            String sizeOutput = ssh("du -sb \"" + snapshotFolder + "\" | cut -f1");
            long bytes = Long.parseLong(sizeOutput.trim());
            return bytes / (1024L * 1024L);
        } catch (Exception e) {
            log.warn("Failed to get remote snapshot size: {}", e.getMessage());
            return 0L;
        }
    }
}
