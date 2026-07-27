package com.cloud_pricer.repository;

import com.cloud_pricer.domain.PriceConfig;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PriceConfigRepository extends JpaRepository<PriceConfig, UUID> {
    List<PriceConfig> findByMode(String mode);
    Page<PriceConfig> findByMode(String mode, Pageable pageable);
    List<PriceConfig> findByModeAndIsActive(String mode, boolean isActive);
    List<PriceConfig> findByIsActiveTrue();
}
