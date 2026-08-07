package com.cloud_pricer.service;

import com.cloud_pricer.config.UserContext;
import com.cloud_pricer.domain.CostBreakdown;
import com.cloud_pricer.domain.CostRecord;
import com.cloud_pricer.exception.ApiException;
import com.cloud_pricer.repository.CostBreakdownRepository;
import com.cloud_pricer.repository.CostRecordRepository;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class CostRecordService {

    private final CostRecordRepository costRecordRepository;
    private final CostBreakdownRepository costBreakdownRepository;

    @Transactional
    public CostRecord create(CostRecord record, List<CostBreakdown> breakdowns) {
        boolean duplicate = costRecordRepository
                .findByServiceEnvironmentIdAndPeriodStartAndPeriodEndAndMode(
                        record.getServiceEnvironmentId(),
                        record.getPeriodStart(),
                        record.getPeriodEnd(),
                        record.getMode())
                .isPresent();
        if (duplicate) {
            log.info("Skipping duplicate cost record for se={} window=[{},{}] mode={}",
                    record.getServiceEnvironmentId(), record.getPeriodStart(), record.getPeriodEnd(),
                    record.getMode());
            return record;
        }

        CostRecord saved = costRecordRepository.save(record);
        if (breakdowns != null) {
            for (CostBreakdown bd : breakdowns) {
                bd.setCostRecordId(saved.getId());
            }
            costBreakdownRepository.saveAll(breakdowns);
        }
        log.info("Created cost record {} for tenant {}", saved.getId(), saved.getTenantId());
        return saved;
    }

    public CostRecord getById(UUID id) {
        return costRecordRepository.findById(id)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Cost record not found"));
    }

    public List<CostRecord> getAll() {
        return costRecordRepository.findByTenantId(UserContext.getTenantId());
    }

    public List<CostRecord> getByTenantId(UUID tenantId) {
        return costRecordRepository.findByTenantId(tenantId);
    }

    public Page<CostRecord> getPageByTenantId(UUID tenantId, Pageable pageable) {
        return costRecordRepository.findByTenantId(tenantId, pageable);
    }

    public List<CostRecord> getByServiceEnvironmentId(UUID serviceEnvironmentId) {
        return costRecordRepository.findByServiceEnvironmentId(serviceEnvironmentId);
    }

    public CostRecord findLatestByServiceEnvironmentId(UUID serviceEnvironmentId) {
        return costRecordRepository
            .findFirstByServiceEnvironmentIdOrderByPeriodEndDesc(serviceEnvironmentId)
            .orElse(null);
    }

    public List<CostBreakdown> getBreakdowns(UUID costRecordId) {
        return costBreakdownRepository.findByCostRecordId(costRecordId);
    }

    public List<Object[]> aggregateByTenant(UUID tenantId) {
        return costRecordRepository.aggregateByTenantForTenant(tenantId);
    }

    public List<Object[]> aggregateByServiceEnvironment(UUID tenantId) {
        return costRecordRepository.aggregateByServiceEnvironmentForTenant(tenantId);
    }

    public List<Object[]> aggregateByPeriod(UUID tenantId) {
        return costRecordRepository.aggregateByPeriodForTenant(tenantId);
    }

    public List<Object[]> aggregateByPeriodForTenant(UUID tenantId) {
        return costRecordRepository.aggregateByPeriodForTenant(tenantId);
    }

    public List<Object[]> aggregateByServiceEnvironmentForTenant(UUID tenantId) {
        return costRecordRepository.aggregateByServiceEnvironmentForTenant(tenantId);
    }
}
