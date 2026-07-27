package com.cloud_pricer.service;

import com.cloud_pricer.config.UserContext;
import com.cloud_pricer.domain.CostForecast;
import com.cloud_pricer.domain.CostRecord;
import com.cloud_pricer.exception.ApiException;
import com.cloud_pricer.repository.CostForecastRepository;
import com.cloud_pricer.repository.CostRecordRepository;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class ForecastService {

    private final CostForecastRepository forecastRepository;
    private final CostRecordRepository costRecordRepository;

    public CostForecast generateForecast(UUID tenantId, UUID serviceEnvironmentId, String period) {
        List<CostRecord> records = costRecordRepository.findByTenantIdAndServiceEnvironmentId(tenantId, serviceEnvironmentId);

        double predictedCost;
        double confidence;

        if (records.isEmpty()) {
            predictedCost = 0.0;
            confidence = 0.0;
        } else if (records.size() == 1) {
            predictedCost = records.get(0).getTotalCost();
            confidence = 0.3;
        } else {
            // Moving average of last 3 records (or all if less than 3)
            int window = Math.min(records.size(), 3);
            double sum = 0;
            for (int i = records.size() - window; i < records.size(); i++) {
                sum += records.get(i).getTotalCost();
            }
            predictedCost = sum / window;
            confidence = Math.min(0.9, 0.3 + (window * 0.2));
        }

        CostForecast forecast = new CostForecast();
        forecast.setTenantId(tenantId);
        forecast.setServiceEnvironmentId(serviceEnvironmentId);
        forecast.setPeriod(period);
        forecast.setPredictedCost(predictedCost);
        forecast.setConfidenceLevel(confidence);

        CostForecast saved = forecastRepository.save(forecast);
        log.info("Generated forecast {} for tenant {} period {}", saved.getId(), tenantId, period);
        return saved;
    }

    public List<CostForecast> getByTenantId(UUID tenantId) {
        return forecastRepository.findByTenantId(tenantId);
    }

    public List<CostForecast> getByServiceEnvironmentId(UUID serviceEnvironmentId) {
        return forecastRepository.findByServiceEnvironmentId(serviceEnvironmentId);
    }

    public List<CostForecast> getAll() {
        return forecastRepository.findByTenantId(UserContext.getTenantId());
    }

    public void delete(UUID id) {
        forecastRepository.deleteById(id);
    }
}
