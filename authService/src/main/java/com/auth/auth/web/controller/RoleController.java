package com.auth.auth.web.controller;

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

import com.auth.auth.service.RoleService;
import com.auth.auth.web.dto.AuthActionResponse;
import com.auth.auth.web.dto.RoleAssignUserRequest;
import com.auth.auth.web.dto.RoleCreateRequest;
import com.auth.auth.web.dto.RolePermissionAssignRequest;
import com.auth.auth.web.dto.RoleResponse;
import com.auth.auth.web.dto.RoleUpdateRequest;
import com.auth.auth.web.routes.ApiRoutes;

import jakarta.validation.Valid;

@RestController
@RequestMapping(ApiRoutes.Roles.BASE)
@Validated
public class RoleController {

    private final RoleService roleService;

    public RoleController(RoleService roleService) {
        this.roleService = roleService;
    }

    @GetMapping
    public ResponseEntity<List<RoleResponse>> listRoles(@RequestHeader("Authorization") String authorizationHeader) {
        return ResponseEntity.ok(roleService.listRoles(authorizationHeader));
    }

    @PostMapping
    public ResponseEntity<RoleResponse> createRole(
            @RequestHeader("Authorization") String authorizationHeader,
            @Valid @RequestBody RoleCreateRequest request
    ) {
        return ResponseEntity.ok(roleService.createRole(authorizationHeader, request));
    }

    @PatchMapping(ApiRoutes.Roles.BY_ID)
    public ResponseEntity<RoleResponse> updateRole(
            @RequestHeader("Authorization") String authorizationHeader,
            @PathVariable UUID roleId,
            @RequestBody RoleUpdateRequest request
    ) {
        return ResponseEntity.ok(roleService.updateRole(authorizationHeader, roleId, request));
    }

    @DeleteMapping(ApiRoutes.Roles.BY_ID)
    public ResponseEntity<AuthActionResponse> deleteRole(
            @RequestHeader("Authorization") String authorizationHeader,
            @PathVariable UUID roleId
    ) {
        return ResponseEntity.ok(roleService.deleteRole(authorizationHeader, roleId));
    }

    @PostMapping(ApiRoutes.Roles.PERMISSIONS)
    public ResponseEntity<RoleResponse> addPermissionToRole(
            @RequestHeader("Authorization") String authorizationHeader,
            @PathVariable UUID roleId,
            @RequestBody RolePermissionAssignRequest request
    ) {
        return ResponseEntity.ok(roleService.addPermissionToRole(authorizationHeader, roleId, request));
    }

    @DeleteMapping(ApiRoutes.Roles.PERMISSION_BY_ID)
    public ResponseEntity<AuthActionResponse> removePermissionFromRole(
            @RequestHeader("Authorization") String authorizationHeader,
            @PathVariable UUID roleId,
            @PathVariable UUID permissionId
    ) {
        return ResponseEntity.ok(roleService.removePermissionFromRole(authorizationHeader, roleId, permissionId));
    }

    @PostMapping(ApiRoutes.Roles.USERS)
    public ResponseEntity<AuthActionResponse> assignUserToRole(
            @RequestHeader("Authorization") String authorizationHeader,
            @PathVariable UUID roleId,
            @Valid @RequestBody RoleAssignUserRequest request
    ) {
        return ResponseEntity.ok(roleService.assignUserToRole(authorizationHeader, roleId, request));
    }

    @DeleteMapping(ApiRoutes.Roles.USER_BY_ID)
    public ResponseEntity<AuthActionResponse> unassignUserFromRole(
            @RequestHeader("Authorization") String authorizationHeader,
            @PathVariable UUID roleId,
            @PathVariable UUID userId
    ) {
        return ResponseEntity.ok(roleService.unassignUserFromRole(authorizationHeader, roleId, userId));
    }
}
