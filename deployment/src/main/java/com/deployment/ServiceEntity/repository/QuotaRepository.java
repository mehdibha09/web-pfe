package com.deployment.ServiceEntity.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.deployment.ServiceEntity.domain.Quota;

@Repository
public interface QuotaRepository extends JpaRepository<Quota, UUID> {

    Optional<Quota> findFirstByServiceEnvironmentIdAndActiveTrueOrderByCreatedAtDesc(UUID serviceEnvironmentId);
}
