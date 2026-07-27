package com.auth.service.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import com.auth.service.domain.Role;

public interface RoleRepository extends JpaRepository<Role, UUID> {
    List<Role> findByTenant_Id(UUID tenantId);
    Page<Role> findByTenant_Id(UUID tenantId, Pageable pageable);
    Optional<Role> findByTenant_IdAndName(UUID tenantId, String name);
}
