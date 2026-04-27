package com.auth.auth.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.auth.auth.domain.Role;

public interface RoleRepository extends JpaRepository<Role, UUID> {
    List<Role> findByTenant_Id(UUID tenantId);
    Optional<Role> findByTenant_IdAndName(UUID tenantId, String name);
}
