package com.auth.auth.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.auth.auth.domain.SsoIdentity;

public interface SsoIdentityRepository extends JpaRepository<SsoIdentity, UUID> {
    Optional<SsoIdentity> findByProviderAndSubject(String provider, String subject);
    Optional<SsoIdentity> findByProviderAndEmail(String provider, String email);
}
