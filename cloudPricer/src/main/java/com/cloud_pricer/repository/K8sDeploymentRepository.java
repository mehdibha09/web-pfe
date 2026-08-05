package com.cloud_pricer.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.cloud_pricer.domain.K8sDeployment;

public interface K8sDeploymentRepository extends JpaRepository<K8sDeployment, UUID> {

    List<K8sDeployment> findByServiceEnvironmentId(UUID serviceEnvironmentId);
}
