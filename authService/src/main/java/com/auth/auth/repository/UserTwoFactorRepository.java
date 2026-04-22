package com.auth.auth.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.auth.auth.domain.UserTwoFactor;

public interface UserTwoFactorRepository extends JpaRepository<UserTwoFactor, UUID> {
    Optional<UserTwoFactor> findByUser_Id(UUID userId);
    Optional<UserTwoFactor> findByUser_Tenant_IdAndUser_Email(UUID tenantId, String email);
    boolean existsByUser_IdAndEnabledTrue(UUID userId);
}
