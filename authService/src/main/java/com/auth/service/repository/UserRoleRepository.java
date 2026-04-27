package com.auth.service.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.auth.service.domain.UserRole;
import com.auth.service.domain.UserRoleId;

public interface UserRoleRepository extends JpaRepository<UserRole, UserRoleId> {
    List<UserRole> findByUser_Id(UUID userId);
    List<UserRole> findByRole_Id(UUID roleId);
}
