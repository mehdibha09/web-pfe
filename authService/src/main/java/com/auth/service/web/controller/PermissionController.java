package com.auth.service.web.controller;

import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.auth.service.service.PermissionService;
import com.auth.service.web.dto.permission.PermissionResponse;
import com.auth.service.web.dto.permission.PermissionUpdateRequest;
import com.auth.service.web.routes.ApiRoutes;

import jakarta.validation.Valid;

@RestController
@RequestMapping(ApiRoutes.Permissions.BASE)
@Validated
public class PermissionController {

    private final PermissionService permissionService;

    public PermissionController(PermissionService permissionService) {
        this.permissionService = permissionService;
    }

    @GetMapping
    public ResponseEntity<Page<PermissionResponse>> listPermissions(
            @RequestHeader("Authorization") String authorizationHeader,
            @PageableDefault(size = 10) Pageable pageable
    ) {
        Page<PermissionResponse> page = permissionService.listPermissions(authorizationHeader, pageable);
        return ResponseEntity.ok(page);
    }

    @GetMapping(ApiRoutes.Permissions.BY_ID)
    public ResponseEntity<PermissionResponse> getPermissionById(
            @RequestHeader("Authorization") String authorizationHeader,
            @PathVariable UUID permissionId
    ) {
        return ResponseEntity.ok(permissionService.getPermissionById(authorizationHeader, permissionId));
    }

    @PatchMapping(ApiRoutes.Permissions.BY_ID)
    public ResponseEntity<PermissionResponse> updatePermission(
            @RequestHeader("Authorization") String authorizationHeader,
            @PathVariable UUID permissionId,
            @RequestBody @Valid PermissionUpdateRequest request
    ) {
        return ResponseEntity.ok(permissionService.updatePermission(authorizationHeader, permissionId, request));
    }
}
