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

import com.auth.service.service.PermissionService;
import com.auth.service.web.dto.AuthActionResponse;
import com.auth.service.web.dto.PermissionCreateRequest;
import com.auth.service.web.dto.PermissionResponse;
import com.auth.service.web.dto.PermissionUpdateRequest;
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
    public ResponseEntity<List<PermissionResponse>> listPermissions(
            @RequestHeader("Authorization") String authorizationHeader
    ) {
        return ResponseEntity.ok(permissionService.listPermissions(authorizationHeader));
    }

    @GetMapping(ApiRoutes.Permissions.BY_ID)
    public ResponseEntity<PermissionResponse> getPermissionById(
            @RequestHeader("Authorization") String authorizationHeader,
            @PathVariable UUID permissionId
    ) {
        return ResponseEntity.ok(permissionService.getPermissionById(authorizationHeader, permissionId));
    }

    @PostMapping
    public ResponseEntity<PermissionResponse> createPermission(
            @RequestHeader("Authorization") String authorizationHeader,
            @Valid @RequestBody PermissionCreateRequest request
    ) {
        return ResponseEntity.ok(permissionService.createPermission(authorizationHeader, request));
    }

    @PatchMapping(ApiRoutes.Permissions.BY_ID)
    public ResponseEntity<PermissionResponse> updatePermission(
            @RequestHeader("Authorization") String authorizationHeader,
            @PathVariable UUID permissionId,
            @RequestBody PermissionUpdateRequest request
    ) {
        return ResponseEntity.ok(permissionService.updatePermission(authorizationHeader, permissionId, request));
    }

    @DeleteMapping(ApiRoutes.Permissions.BY_ID)
    public ResponseEntity<AuthActionResponse> deletePermission(
            @RequestHeader("Authorization") String authorizationHeader,
            @PathVariable UUID permissionId
    ) {
        return ResponseEntity.ok(permissionService.deletePermission(authorizationHeader, permissionId));
    }
}
