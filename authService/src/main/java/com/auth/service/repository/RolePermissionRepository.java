package com.auth.service.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.auth.service.domain.RolePermission;
import com.auth.service.domain.RolePermissionId;

public interface RolePermissionRepository extends JpaRepository<RolePermission, RolePermissionId> {
    List<RolePermission> findByRole_Id(UUID roleId);
    List<RolePermission> findByPermission_Id(UUID permissionId);
}
