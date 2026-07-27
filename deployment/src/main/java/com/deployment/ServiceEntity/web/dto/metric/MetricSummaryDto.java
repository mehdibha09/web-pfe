package com.deployment.ServiceEntity.web.dto.metric;

import lombok.Data;

@Data
public class MetricSummaryDto {

    private double avgCpu;
    private double maxCpu;
    private double minCpu;

    private double avgRam;
    private double maxRam;
    private double minRam;

    private double avgNetwork;
    private double maxNetwork;
    private double minNetwork;

    private double avgDisk;
    private double maxDisk;
    private double minDisk;

    private long totalPods;
    private long count;
}