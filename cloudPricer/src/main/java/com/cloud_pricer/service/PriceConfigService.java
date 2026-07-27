package com.cloud_pricer.service;

import com.cloud_pricer.domain.PriceConfig;
import com.cloud_pricer.exception.ApiException;
import com.cloud_pricer.repository.PriceConfigRepository;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class PriceConfigService {

    private final PriceConfigRepository priceConfigRepository;

    public PriceConfig create(PriceConfig priceConfig) {
        PriceConfig saved = priceConfigRepository.save(priceConfig);
        log.info("Created price config {} for mode {} / {}", saved.getId(), saved.getMode(), saved.getResourceType());
        return saved;
    }

    public PriceConfig getById(UUID id) {
        return priceConfigRepository.findById(id)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Price config not found"));
    }

    public List<PriceConfig> getAll() {
        return priceConfigRepository.findAll();
    }

    public Page<PriceConfig> getAll(String mode, Pageable pageable) {
        if (mode != null && !mode.isBlank()) {
            return priceConfigRepository.findByMode(mode, pageable);
        }
        return priceConfigRepository.findAll(pageable);
    }

    /** System use only — no tenant filter. For user-facing endpoints use getByMode. */
    public List<PriceConfig> getAllByModeForSystem(String mode) {
        return priceConfigRepository.findByMode(mode);
    }

    public List<PriceConfig> getByMode(String mode) {
        return priceConfigRepository.findByMode(mode);
    }

    public PriceConfig update(UUID id, PriceConfig updated) {
        PriceConfig existing = getById(id);
        existing.setMode(updated.getMode());
        existing.setResourceType(updated.getResourceType());
        existing.setPricePerUnit(updated.getPricePerUnit());
        existing.setUnit(updated.getUnit());
        existing.setCurrency(updated.getCurrency());
        existing.setActive(updated.isActive());
        PriceConfig saved = priceConfigRepository.save(existing);
        log.info("Updated price config {}", id);
        return saved;
    }

    public void delete(UUID id) {
        priceConfigRepository.deleteById(id);
        log.info("Deleted price config {}", id);
    }
}
