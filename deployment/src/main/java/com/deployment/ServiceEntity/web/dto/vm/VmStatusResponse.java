package com.deployment.ServiceEntity.web.dto.vm;

import java.time.Instant;
import java.util.UUID;

import com.deployment.ServiceEntity.domain.Vm;

public class VmStatusResponse {

    private UUID id;
    private String name;
    private String status;
    private Instant updatedAt;

    public static VmStatusResponse from(Vm vm) {
        VmStatusResponse r = new VmStatusResponse();
        r.id = vm.getId();
        r.name = vm.getName();
        r.status = vm.getStatus().name();
        r.updatedAt = vm.getUpdatedAt();
        return r;
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant u) {
        this.updatedAt = u;
    }
}