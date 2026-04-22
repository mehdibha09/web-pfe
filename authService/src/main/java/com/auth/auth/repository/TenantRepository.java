package com.auth.auth.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.auth.auth.domain.Tenant;

public interface TenantRepository extends JpaRepository<Tenant, UUID> {
    Optional<Tenant> findByName(String name);
    Optional<Tenant> findByNameIgnoreCase(String name);
}
