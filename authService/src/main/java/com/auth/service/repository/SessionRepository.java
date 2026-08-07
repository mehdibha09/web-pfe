package com.auth.service.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.auth.service.domain.Session;

public interface SessionRepository extends JpaRepository<Session, UUID> {
    List<Session> findByUser_Id(UUID userId);
    Page<Session> findByUser_Id(UUID userId, Pageable pageable);

    @Query("SELECT s FROM Session s WHERE s.user.tenant.id = :tenantId")
    List<Session> findByTenant_Id(@Param("tenantId") UUID tenantId);

    @Query("SELECT s FROM Session s WHERE s.user.tenant.id = :tenantId")
    Page<Session> findByTenant_Id(@Param("tenantId") UUID tenantId, Pageable pageable);

    @Query("SELECT s FROM Session s WHERE s.user.tenant.id = :tenantId")
    List<Session> findAllByTenant_Id(@Param("tenantId") UUID tenantId);

    Optional<Session> findByRefreshToken(String refreshToken);
    Optional<Session> findByAccessToken(String accessToken);
}
