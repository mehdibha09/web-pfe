package com.cloud_pricer.service;

import com.cloud_pricer.config.UserContext;
import com.cloud_pricer.domain.Quota;
import com.cloud_pricer.exception.ApiException;
import com.cloud_pricer.repository.QuotaRepository;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class QuotaService {

    private final QuotaRepository quotaRepository;

    public Quota create(Quota quota) {
        Quota saved = quotaRepository.save(quota);
        log.info("Created quota {} for SE {}", saved.getId(), saved.getServiceEnvironmentId());
        return saved;
    }

    public Quota getById(UUID id) {
        return quotaRepository.findById(id)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Quota not found"));
    }

    public List<Quota> getAll() {
        return quotaRepository.findByTenantId(UserContext.getTenantId());
    }

    public List<Quota> getByServiceEnvironmentId(UUID serviceEnvironmentId) {
        return quotaRepository.findByServiceEnvironmentId(serviceEnvironmentId);
    }

    public Quota update(UUID id, Quota updated) {
        Quota existing = getById(id);
        existing.setMaxCpu(updated.getMaxCpu());
        existing.setMaxRam(updated.getMaxRam());
        existing.setMaxStorage(updated.getMaxStorage());
        existing.setMaxPods(updated.getMaxPods());
        existing.setMaxBudget(updated.getMaxBudget());
        existing.setPeriod(updated.getPeriod());
        existing.setActive(updated.isActive());
        Quota saved = quotaRepository.save(existing);
        log.info("Updated quota {}", id);
        return saved;
    }

    public void delete(UUID id) {
        quotaRepository.deleteById(id);
        log.info("Deleted quota {}", id);
    }
}
