package com.cloud_pricer.repository;

import com.cloud_pricer.domain.ServiceEnvironment;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ServiceEnvironmentRepository extends JpaRepository<ServiceEnvironment, UUID> {
}
