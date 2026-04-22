package com.auth.auth.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.auth.auth.domain.Session;

public interface SessionRepository extends JpaRepository<Session, UUID> {
    List<Session> findByUser_Id(UUID userId);
    Optional<Session> findByRefreshToken(String refreshToken);
    Optional<Session> findByAccessToken(String accessToken);
}
