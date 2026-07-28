package com.deployment.ServiceEntity.domain;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.concurrent.ConcurrentHashMap;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import com.deployment.ServiceEntity.web.dto.vm.VmMetricsSnapshot;

import jakarta.annotation.PostConstruct;

@Component
@ConditionalOnProperty(name = "vm.provider", havingValue = "vagrant", matchIfMissing = true)
public class VagrantVmClient implements VmClient {

    private static final Logger log = LoggerFactory.getLogger(VagrantVmClient.class);

    private final ConcurrentHashMap<String, String[]> sshConfigCache = new ConcurrentHashMap<>();

    @Value("${vagrant.base-dir:./vms}")
    private String baseDir;

    private Path baseDirAbsolute;

    @PostConstruct
    void init() {
        this.baseDirAbsolute = Paths.get(baseDir).toAbsolutePath();
        log.info("Vagrant base directory: {}", this.baseDirAbsolute);
    }

    private String systemPath() {
        String env = System.getenv("PATH");
        return "/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:"
                + (env != null ? env : "");
    }

    @Override
    public String getVmPath(String tenantId, String vmName) {
        return baseDirAbsolute.resolve(tenantId).resolve(vmName).toString();
    }

    private String exec(String vmPath, String... args) {
        Path dir = Paths.get(vmPath);
        if (!Files.isDirectory(dir)) {
            throw new RuntimeException("Vagrant directory does not exist: " + vmPath);
        }
        if (!Files.exists(dir.resolve("Vagrantfile"))) {
            throw new RuntimeException("Vagrantfile missing in: " + vmPath);
        }

        try {
            String[] command = new String[args.length + 1];
            command[0] = "vagrant";
            System.arraycopy(args, 0, command, 1, args.length);

            ProcessBuilder pb = new ProcessBuilder(command);
            pb.directory(dir.toFile());
            pb.redirectErrorStream(true);
            pb.environment().put("PATH", systemPath());

            Process process = pb.start();
            String output = new String(process.getInputStream().readAllBytes());
            int exitCode = process.waitFor();

            log.info("vagrant [{}] exit={} output={}", args[0], exitCode, output.trim());

            if (exitCode != 0) {
                throw new RuntimeException("Vagrant command failed: " + output);
            }
            return output;

        } catch (IOException | InterruptedException e) {
            throw new RuntimeException("Failed to execute vagrant: " + e.getMessage());
        }
    }

    @Override
    public String createVagrantfile(Vm vm) {
        try {
            log.info("baseDir=[{}] user.dir=[{}]", baseDir, System.getProperty("user.dir"));

            String vbName = vm.getName();

            String networkName = "tenant-" + vm.getTenantId().toString().substring(0, 8);
            String ip = generateIp(vm);

            Path vmDir = Paths.get(vm.getVagrantPath());
            Files.createDirectories(vmDir);

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

                        # Create agent directory
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

                        # Systemd service
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

            Files.writeString(vmDir.resolve("Vagrantfile"), vagrantfile);
            log.info("Vagrantfile created at {} vbName={}", vmDir, vbName);

            return vbName;

        } catch (IOException e) {
            throw new RuntimeException("Failed to create Vagrantfile: " + e.getMessage());
        }
    }

    private String generateIp(Vm vm) {
        int x = Math.abs(vm.getTenantId().hashCode()) % 254 + 1;
        int y = Math.abs(vm.getId().hashCode()) % 254 + 1;
        return "192.168." + x + "." + y;
    }

    @Override
    public void up(String vmPath) {
        log.info("Starting VM at {}", vmPath);
        exec(vmPath, "up", "--no-color");
    }

    @Override
    public void halt(String vmPath) {
        log.info("Stopping VM at {}", vmPath);
        exec(vmPath, "halt", "--no-color");
    }

    @Override
    public void reload(String vmPath) {
        log.info("Restarting VM at {}", vmPath);
        exec(vmPath, "reload", "--no-color");
    }

    @Override
    public void destroy(String vmPath) {
        log.info("Destroying VM at {}", vmPath);
        try {
            exec(vmPath, "destroy", "--force", "--no-color");
        } catch (Exception e) {
            log.warn("Vagrant destroy failed: {}", e.getMessage());
        }
        try {
            Path dir = Paths.get(vmPath);
            if (Files.exists(dir)) {
                Files.walk(dir)
                        .sorted(java.util.Comparator.reverseOrder())
                        .map(Path::toFile)
                        .forEach(java.io.File::delete);
            }
        } catch (IOException e) {
            log.warn("Failed to delete VM directory: {}", e.getMessage());
        }
    }

    @Override
    public String status(String vmPath) {
        try {
            String output = exec(vmPath, "status", "--no-color");
            if (output.contains("running"))
                return "running";
            if (output.contains("poweroff"))
                return "poweroff";
            if (output.contains("not created"))
                return "not_created";
            if (output.contains("aborted"))
                return "aborted";
            if (output.contains("saved"))
                return "stopped";
            return "unknown";
        } catch (Exception e) {
            log.warn("Failed to get VM status: {}", e.getMessage());
            return "unknown";
        }
    }

    @Override
    public VagrantSshConfig getSshConfig(String vmPath) {
        try {
            String output = exec(vmPath, "ssh-config", "--no-color");
            VagrantSshConfig config = new VagrantSshConfig();

            for (String line : output.split("\n")) {
                line = line.trim();
                if (line.startsWith("HostName "))
                    config.setHost(line.split("\\s+")[1]);
                if (line.startsWith("Port "))
                    config.setPort(Integer.parseInt(line.split("\\s+")[1]));
                if (line.startsWith("User ") && !line.startsWith("UserKnown"))
                    config.setUser(line.split("\\s+")[1]);
                if (line.startsWith("IdentityFile "))
                    config.setPrivateKeyPath(line.split("\\s+")[1]);
            }
            return config;

        } catch (Exception e) {
            throw new RuntimeException("Failed to get SSH config: " + e.getMessage());
        }
    }

    private static final String VBOX_METRICS = "CPU/Load/User,RAM/Usage/Used,Disk/Usage/Used,Net/Rate/Rx,Net/Rate/Tx";

    private final java.util.Set<String> metricsSetupDone = java.util.concurrent.ConcurrentHashMap.newKeySet();

    @Override
    public void setupMetrics(String vbName) {
        try {
            ProcessBuilder pb = new ProcessBuilder(
                    "VBoxManage", "metrics", "setup",
                    "--period", "5", "--samples", "10",
                    vbName,
                    VBOX_METRICS);
            pb.redirectErrorStream(true);
            pb.environment().put("PATH", systemPath());

            Process process = pb.start();
            String output = new String(process.getInputStream().readAllBytes());
            process.waitFor();
            log.info("Metrics setup for [{}]: {}", vbName, output.trim());
        } catch (Exception e) {
            log.warn("Failed to setup metrics: {}", e.getMessage());
        }
    }

    @Override
    public VmMetricsSnapshot queryMetrics(String vbName) {
        if (!metricsSetupDone.contains(vbName)) {
            setupMetrics(vbName);
            metricsSetupDone.add(vbName);
        }

        try {
            ProcessBuilder pb = new ProcessBuilder(
                    "VBoxManage", "metrics", "collect",
                    "--period", "1", "--samples", "1",
                    vbName,
                    VBOX_METRICS);

            pb.redirectErrorStream(true);
            pb.environment().put("PATH", systemPath());

            Process process = pb.start();
            StringBuilder output = new StringBuilder();
            Thread reader = new Thread(() -> {
                try (var is = process.getInputStream()) {
                    byte[] buf = new byte[4096];
                    int n;
                    while ((n = is.read(buf)) != -1) {
                        output.append(new String(buf, 0, n));
                    }
                } catch (Exception ignored) {
                }
            });
            reader.start();

            process.waitFor(3, java.util.concurrent.TimeUnit.SECONDS);
            process.destroyForcibly();
            reader.join(5000);

            String result = output.toString();
            log.info("VBoxManage metrics collect output:\n{}", result);

            return parseMetricsOutput(result);
        } catch (Exception e) {
            log.warn("Failed to query metrics: {}", e.getMessage());
            return null;
        }
    }

    private VmMetricsSnapshot parseMetricsOutput(String output) {
        VmMetricsSnapshot snapshot = new VmMetricsSnapshot();
        double netRx = 0;
        double netTx = 0;

        for (String line : output.split("\n")) {
            line = line.trim();
            if (line.isEmpty() || line.startsWith("Time") || line.startsWith("---"))
                continue;

            String[] parts = line.split("\\s+");
            if (parts.length < 4)
                continue;

            String metricName = parts[2];
            String valueToken = parts[3];
            String valueStr = valueToken.replaceAll("[^0-9.]", "");
            if (valueStr.isEmpty())
                continue;

            try {
                double value = Double.parseDouble(valueStr);
                log.info("Parsed metric: {} = {}", metricName, value);

                if (metricName.equals("CPU/Load/User")) {
                    snapshot.setCpuUsage((float) value);
                } else if (metricName.equals("RAM/Usage/Used")) {
                    snapshot.setRamUsageKb(value);
                } else if (metricName.equals("Disk/Usage/Used")) {
                    snapshot.setDiskUsageMb(value);
                } else if (metricName.equals("Net/Rate/Rx")) {
                    netRx = value;
                } else if (metricName.equals("Net/Rate/Tx")) {
                    netTx = value;
                }
            } catch (NumberFormatException e) {
                log.warn("Cannot parse value [{}] for metric [{}]", valueStr, metricName);
            }
        }

        snapshot.setNetworkRateBps(netRx + netTx);

        log.info("Snapshot: cpu={}% ram={}KB disk={}MB net={}B/s",
                snapshot.getCpuUsage(), snapshot.getRamUsageKb(),
                snapshot.getDiskUsageMb(), snapshot.getNetworkRateBps());

        return snapshot;
    }

    @Override
    public String executeCommand(String vmPath, String command) {
        log.info("SSH execute on {}: {}", vmPath, command);

        String[] cfg = sshConfigCache.computeIfAbsent(vmPath, path -> {
            log.info("Parsing vagrant ssh-config for {}", path);
            String output = exec(path, "ssh-config", "--no-color");
            String port = "2222";
            String user = "vagrant";
            String identityFile = "";
            for (String line : output.split("\n")) {
                line = line.trim();
                if (line.startsWith("Port "))
                    port = line.split("\\s+")[1];
                if (line.startsWith("User ") && !line.startsWith("UserKnown"))
                    user = line.split("\\s+")[1];
                if (line.startsWith("IdentityFile "))
                    identityFile = line.split("\\s+")[1];
            }
            return new String[] { port, user, identityFile };
        });

        String port = cfg[0];
        String user = cfg[1];
        String identityFile = cfg[2];

        try {
            Path dir = Paths.get(vmPath);
            String[] sshCmd = {
                    "ssh",
                    "-o", "StrictHostKeyChecking=no",
                    "-o", "UserKnownHostsFile=/dev/null",
                    "-o", "LogLevel=QUIET",
                    "-p", port,
                    "-i", identityFile,
                    user + "@127.0.0.1",
                    command
            };

            ProcessBuilder pb = new ProcessBuilder(sshCmd);
            pb.redirectErrorStream(true);
            pb.environment().put("PATH", systemPath());

            Process process = pb.start();
            String output = new String(process.getInputStream().readAllBytes());
            int exitCode = process.waitFor();

            log.info("ssh direct exit={} output={}", exitCode, output.trim());

            if (exitCode != 0) {
                throw new RuntimeException("SSH command failed: " + output);
            }
            return output;

        } catch (IOException | InterruptedException e) {
            throw new RuntimeException("Failed to execute SSH command: " + e.getMessage());
        }
    }

    @Override
    public void invalidateSshConfigCache(String vmPath) {
        sshConfigCache.remove(vmPath);
    }

    @Override
    public String readRemoteFile(String filePath) {
        try {
            return java.nio.file.Files.readString(java.nio.file.Paths.get(filePath));
        } catch (IOException e) {
            throw new RuntimeException("Failed to read file: " + filePath, e);
        }
    }

    @Override
    public void takeSnapshot(String vbName, String snapshotName) {
        try {
            ProcessBuilder pb = new ProcessBuilder(
                    "VBoxManage", "snapshot", vbName,
                    "take", snapshotName,
                    "--description", "Backup snapshot: " + snapshotName);
            pb.redirectErrorStream(true);
            pb.environment().put("PATH", systemPath());

            Process process = pb.start();
            String output = new String(process.getInputStream().readAllBytes());
            int exitCode = process.waitFor();
            log.info("Snapshot take [{}] exit={} output={}", snapshotName, exitCode, output.trim());

            if (exitCode != 0) {
                throw new RuntimeException("Snapshot take failed: " + output);
            }
        } catch (Exception e) {
            throw new RuntimeException("Failed to take snapshot: " + e.getMessage());
        }
    }

    @Override
    public void restoreSnapshot(String vbName, String snapshotName) {
        try {
            ProcessBuilder pb = new ProcessBuilder(
                    "VBoxManage", "snapshot", vbName,
                    "restore", snapshotName);
            pb.redirectErrorStream(true);
            pb.environment().put("PATH", systemPath());

            Process process = pb.start();
            String output = new String(process.getInputStream().readAllBytes());
            int exitCode = process.waitFor();
            log.info("Snapshot restore [{}] exit={} output={}", snapshotName, exitCode, output.trim());

            if (exitCode != 0) {
                throw new RuntimeException("Snapshot restore failed: " + output);
            }
        } catch (Exception e) {
            throw new RuntimeException("Failed to restore snapshot: " + e.getMessage());
        }
    }

    @Override
    public void deleteSnapshot(String vbName, String snapshotName) {
        try {
            ProcessBuilder pb = new ProcessBuilder(
                    "VBoxManage", "snapshot", vbName,
                    "delete", snapshotName);
            pb.redirectErrorStream(true);
            pb.environment().put("PATH", systemPath());

            Process process = pb.start();
            String output = new String(process.getInputStream().readAllBytes());
            int exitCode = process.waitFor();
            log.info("Snapshot delete [{}] exit={} output={}", snapshotName, exitCode, output.trim());

            if (exitCode != 0) {
                log.warn("Snapshot delete failed: {}", output);
            }
        } catch (Exception e) {
            log.warn("Failed to delete snapshot: {}", e.getMessage());
        }
    }

    @Override
    public long getSnapshotSizeMb(String vbName) {
        try {
            ProcessBuilder pb = new ProcessBuilder(
                    "VBoxManage", "showvminfo", vbName, "--machinereadable");
            pb.redirectErrorStream(true);
            pb.environment().put("PATH", systemPath());

            Process process = pb.start();
            String output = new String(process.getInputStream().readAllBytes());
            int exitCode = process.waitFor();

            if (exitCode != 0) return 0L;

            String snapshotFolder = null;
            for (String line : output.split("\n")) {
                if (line.startsWith("\"SnapshotFolder\"")) {
                    snapshotFolder = line.split("=", 2)[1].replaceAll("\"", "").trim();
                }
            }

            if (snapshotFolder == null) return 0L;

            java.nio.file.Path folder = java.nio.file.Paths.get(snapshotFolder);
            if (!java.nio.file.Files.isDirectory(folder)) return 0L;

            long totalBytes = 0;
            try (var files = java.nio.file.Files.walk(folder)) {
                for (var file : (Iterable<java.nio.file.Path>) files::iterator) {
                    if (java.nio.file.Files.isRegularFile(file)) {
                        totalBytes += java.nio.file.Files.size(file);
                    }
                }
            }
            return totalBytes / (1024L * 1024L);
        } catch (Exception e) {
            log.warn("Failed to get snapshot size for {}: {}", vbName, e.getMessage());
            return 0L;
        }
    }
}
