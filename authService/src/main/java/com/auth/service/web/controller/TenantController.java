package com.auth.service.web.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.auth.service.service.TenantService;
import com.auth.service.web.dto.RoleResponse;
import com.auth.service.web.dto.TenantCreateRequest;
import com.auth.service.web.dto.TenantResponse;
import com.auth.service.web.dto.TenantUpdateRequest;
import com.auth.service.web.dto.UserResponse;
import com.auth.service.web.routes.ApiRoutes;

import jakarta.validation.Valid;

@RestController
@RequestMapping(ApiRoutes.Tenants.BASE)
@Validated
public class TenantController {

    private final TenantService tenantService;

    public TenantController(TenantService tenantService) {
        this.tenantService = tenantService;
    }

    @GetMapping
    public ResponseEntity<List<TenantResponse>> listTenants(@RequestHeader("Authorization") String authorizationHeader) {
        return ResponseEntity.ok(tenantService.listTenants(authorizationHeader));
    }

    @GetMapping(ApiRoutes.Tenants.BY_ID)
    public ResponseEntity<TenantResponse> getTenantById(
            @RequestHeader("Authorization") String authorizationHeader,
            @PathVariable UUID tenantId
    ) {
        return ResponseEntity.ok(tenantService.getTenantById(authorizationHeader, tenantId));
    }

    @PostMapping
    public ResponseEntity<TenantResponse> createTenant(
            @RequestHeader("Authorization") String authorizationHeader,
            @Valid @RequestBody TenantCreateRequest request
    ) {
        return ResponseEntity.ok(tenantService.createTenant(authorizationHeader, request));
    }

    @PatchMapping(ApiRoutes.Tenants.BY_ID)
    public ResponseEntity<TenantResponse> updateTenant(
            @RequestHeader("Authorization") String authorizationHeader,
            @PathVariable UUID tenantId,
            @RequestBody TenantUpdateRequest request
    ) {
        return ResponseEntity.ok(tenantService.updateTenant(authorizationHeader, tenantId, request));
    }

    @DeleteMapping(ApiRoutes.Tenants.BY_ID)
    public ResponseEntity<TenantResponse> disableTenant(
            @RequestHeader("Authorization") String authorizationHeader,
            @PathVariable UUID tenantId
    ) {
        return ResponseEntity.ok(tenantService.disableTenant(authorizationHeader, tenantId));
    }

    @GetMapping(ApiRoutes.Tenants.USERS)
    public ResponseEntity<List<UserResponse>> listTenantUsers(
            @RequestHeader("Authorization") String authorizationHeader,
            @PathVariable UUID tenantId
    ) {
        return ResponseEntity.ok(tenantService.listTenantUsers(authorizationHeader, tenantId));
    }

    @GetMapping(ApiRoutes.Tenants.ROLES)
    public ResponseEntity<List<RoleResponse>> listTenantRoles(
            @RequestHeader("Authorization") String authorizationHeader,
            @PathVariable UUID tenantId
    ) {
        return ResponseEntity.ok(tenantService.listTenantRoles(authorizationHeader, tenantId));
    }
}
