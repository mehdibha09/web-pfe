package com.cloud_pricer.repository;

import com.cloud_pricer.domain.CostForecast;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CostForecastRepository extends JpaRepository<CostForecast, UUID> {
    List<CostForecast> findByTenantId(UUID tenantId);
    List<CostForecast> findByServiceEnvironmentId(UUID serviceEnvironmentId);
}
