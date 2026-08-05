package com.cloud_pricer.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.cloud_pricer.domain.Vm;

public interface VmRepository extends JpaRepository<Vm, UUID> {

    List<Vm> findByServiceEnvironmentId(UUID serviceEnvironmentId);
}
