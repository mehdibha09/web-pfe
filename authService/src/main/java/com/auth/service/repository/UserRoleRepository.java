package com.auth.auth.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.auth.auth.domain.UserRole;
import com.auth.auth.domain.UserRoleId;

public interface UserRoleRepository extends JpaRepository<UserRole, UserRoleId> {
    List<UserRole> findByUser_Id(UUID userId);
    List<UserRole> findByRole_Id(UUID roleId);
}
