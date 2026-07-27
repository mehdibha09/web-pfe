package com.deployment.ServiceEntity.web.dto.vm;

public class VmMetricsSnapshot {
    private float cpuUsage; // %
    private double ramUsageKb; // kB utilisés
    private double diskUsageMb; // MB utilisés (brut, avant conversion en %)
    private double networkRateBps; // B/s (Rx + Tx combinés)

    public float getCpuUsage() {
        return cpuUsage;
    }

    public void setCpuUsage(float cpuUsage) {
        this.cpuUsage = cpuUsage;
    }

    public double getRamUsageKb() {
        return ramUsageKb;
    }

    public void setRamUsageKb(double ramUsageKb) {
        this.ramUsageKb = ramUsageKb;
    }

    public double getDiskUsageMb() {
        return diskUsageMb;
    }

    public void setDiskUsageMb(double diskUsageMb) {
        this.diskUsageMb = diskUsageMb;
    }

    public double getNetworkRateBps() {
        return networkRateBps;
    }

    public void setNetworkRateBps(double networkRateBps) {
        this.networkRateBps = networkRateBps;
    }
}