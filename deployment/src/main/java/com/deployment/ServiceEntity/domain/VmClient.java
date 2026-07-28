package com.deployment.ServiceEntity.domain;

import com.deployment.ServiceEntity.web.dto.vm.VmMetricsSnapshot;

public interface VmClient {

    String getVmPath(String tenantId, String vmName);

    String createVagrantfile(Vm vm);

    void up(String vmPath);

    void halt(String vmPath);

    void reload(String vmPath);

    void destroy(String vmPath);

    String status(String vmPath);

    VagrantSshConfig getSshConfig(String vmPath);

    void setupMetrics(String vmIdentifier);

    VmMetricsSnapshot queryMetrics(String vmIdentifier);

    String executeCommand(String vmPath, String command);

    String readRemoteFile(String filePath);

    void invalidateSshConfigCache(String vmPath);

    void takeSnapshot(String vmIdentifier, String snapshotName);

    void restoreSnapshot(String vmIdentifier, String snapshotName);

    void deleteSnapshot(String vmIdentifier, String snapshotName);

    long getSnapshotSizeMb(String vmIdentifier);
}
