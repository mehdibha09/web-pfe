package com.cloud_pricer.repository;

import com.cloud_pricer.domain.CostBreakdown;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CostBreakdownRepository extends JpaRepository<CostBreakdown, UUID> {
    List<CostBreakdown> findByCostRecordId(UUID costRecordId);
}
