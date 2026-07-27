package com.deployment.ServiceEntity.service;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import com.deployment.ServiceEntity.domain.Metric;
import com.deployment.ServiceEntity.exception.ApiException;
import com.deployment.ServiceEntity.repository.MetricRepository;
import com.deployment.ServiceEntity.web.dto.metric.MetricSummaryDto;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class MetricService {

    private final MetricRepository metricRepository;

    public Metric create(Metric metric) {
        return metricRepository.save(metric);
    }

    public Metric getById(UUID id) {
        return metricRepository
                .findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Metric not found"));
    }

    public Metric update(UUID id, Metric metric) {
        Metric existing = metricRepository
                .findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Metric not found"));

        existing.setCpuUsage(metric.getCpuUsage());
        existing.setRamUsage(metric.getRamUsage());
        existing.setNetworkUsage(metric.getNetworkUsage());
        existing.setDiskUsage(metric.getDiskUsage());
        existing.setPods(metric.getPods());
        existing.setServiceEnvironmentId(metric.getServiceEnvironmentId());
        if (metric.getTimestamp() != null) {
            existing.setTimestamp(metric.getTimestamp());
        }

        return metricRepository.save(existing);
    }

    public List<Metric> getAll() {
        return metricRepository.findAll();
    }

    public Page<Metric> getAll(
            UUID serviceEnvironmentId, Instant from, Instant to, Pageable pageable) {
        if (from != null && to != null && from.isAfter(to)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "BAD_REQUEST", "from must be before to");
        }

        Specification<Metric> specification = Specification.where((root, query, cb) -> cb.conjunction());

        if (serviceEnvironmentId != null) {
            specification = specification.and(
                    (root, query, criteriaBuilder) -> criteriaBuilder.equal(
                            root.get("serviceEnvironmentId"), serviceEnvironmentId));
        }

        if (from != null) {
            specification = specification.and(
                    (root, query, criteriaBuilder) -> criteriaBuilder.greaterThanOrEqualTo(
                            root.get("timestamp"), from));
        }

        if (to != null) {
            specification = specification.and(
                    (root, query, criteriaBuilder) -> criteriaBuilder.lessThanOrEqualTo(
                            root.get("timestamp"), to));
        }

        return metricRepository.findAll(specification, pageable);
    }

    // public void delete(UUID id) {
    // metricRepository.deleteById(id);
    // }

    public Metric getLatest(UUID serviceEnvId) {
        return metricRepository
                .findTopByServiceEnvironmentIdOrderByCreatedAtDesc(serviceEnvId)
                .orElseThrow(
                        () -> new EntityNotFoundException("No metric found for service environment: " + serviceEnvId));
    }

    public void deleteByServiceEnvironment(UUID serviceEnvironmentId) {
        metricRepository.deleteByServiceEnvironmentId(serviceEnvironmentId);
    }

    public List<Metric> getMetricsByServiceEnvironment(UUID serviceEnvironmentId) {
        return metricRepository.findByServiceEnvironmentId(serviceEnvironmentId);
    }

    public MetricSummaryDto getSummary(UUID serviceEnvironmentId) {
        Object result = metricRepository.getSummary(serviceEnvironmentId);
        MetricSummaryDto dto = new MetricSummaryDto();

        if (result == null) {
            return dto;
        }

        Object[] row;
        if (result instanceof Object[]) {
            row = (Object[]) result;
        } else {
            return dto;
        }

        if (row.length < 14) {
            return dto;
        }

        dto.setAvgCpu(row[0] != null ? ((Number) row[0]).doubleValue() : 0.0);
        dto.setMaxCpu(row[1] != null ? ((Number) row[1]).doubleValue() : 0.0);
        dto.setMinCpu(row[2] != null ? ((Number) row[2]).doubleValue() : 0.0);

        dto.setAvgRam(row[3] != null ? ((Number) row[3]).doubleValue() : 0.0);
        dto.setMaxRam(row[4] != null ? ((Number) row[4]).doubleValue() : 0.0);
        dto.setMinRam(row[5] != null ? ((Number) row[5]).doubleValue() : 0.0);

        dto.setAvgNetwork(row[6] != null ? ((Number) row[6]).doubleValue() : 0.0);
        dto.setMaxNetwork(row[7] != null ? ((Number) row[7]).doubleValue() : 0.0);
        dto.setMinNetwork(row[8] != null ? ((Number) row[8]).doubleValue() : 0.0);

        dto.setAvgDisk(row[9] != null ? ((Number) row[9]).doubleValue() : 0.0);
        dto.setMaxDisk(row[10] != null ? ((Number) row[10]).doubleValue() : 0.0);
        dto.setMinDisk(row[11] != null ? ((Number) row[11]).doubleValue() : 0.0);

        dto.setTotalPods(row[12] != null ? ((Number) row[12]).longValue() : 0L);
        dto.setCount(row[13] != null ? ((Number) row[13]).longValue() : 0L);

        return dto;
    }
}
