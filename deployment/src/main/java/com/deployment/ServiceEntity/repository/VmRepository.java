package com.deployment.ServiceEntity.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.deployment.ServiceEntity.domain.Vm;

@Repository
public interface VmRepository extends JpaRepository<Vm, UUID> {

    List<Vm> findByServiceEnvironmentId(UUID serviceEnvironmentId);

    List<Vm> findByStatus(Vm.Status status);

    List<Vm> findByTenantId(UUID tenantId);

    Page<Vm> findByTenantId(UUID tenantId, Pageable pageable);

    Page<Vm> findByServiceEnvironmentId(UUID serviceEnvironmentId, Pageable pageable);

    Page<Vm> findByStatus(Vm.Status status, Pageable pageable);

    boolean existsByNameAndServiceEnvironmentId(String name, UUID serviceEnvironmentId);

    void deleteByServiceEnvironmentId(UUID serviceEnvironmentId);

}