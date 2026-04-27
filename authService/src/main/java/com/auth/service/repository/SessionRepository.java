package com.auth.service.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.auth.service.domain.Session;

public interface SessionRepository extends JpaRepository<Session, UUID> {
    List<Session> findByUser_Id(UUID userId);
    Optional<Session> findByRefreshToken(String refreshToken);
    Optional<Session> findByAccessToken(String accessToken);
}
