package com.auth.service.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.auth.service.domain.User;

public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByTenant_IdAndEmail(UUID tenantId, String email);
    List<User> findByEmail(String email);
    List<User> findByTenant_Id(UUID tenantId);
    long countByTenant_Id(UUID tenantId);
}
