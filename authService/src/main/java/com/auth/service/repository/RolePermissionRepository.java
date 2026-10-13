package com.auth.service.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.auth.service.domain.RolePermission;
import com.auth.service.domain.RolePermissionId;

public interface RolePermissionRepository extends JpaRepository<RolePermission, RolePermissionId> {
    List<RolePermission> findByRole_Id(UUID roleId);
    List<RolePermission> findByPermission_Id(UUID permissionId);

    /** Cascade bulk delete — used when a tenant is permanently deleted. */
    @Modifying
    @Query("DELETE FROM RolePermission rp WHERE rp.role.id IN " +
           "(SELECT r.id FROM Role r WHERE r.tenant.id = :tenantId)")
    void deleteAllByTenantId(@Param("tenantId") UUID tenantId);
}
