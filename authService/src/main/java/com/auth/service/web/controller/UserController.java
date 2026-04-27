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

import com.auth.auth.service.UserService;
import com.auth.auth.web.dto.AuthActionResponse;
import com.auth.auth.web.dto.RoleResponse;
import com.auth.auth.web.dto.UserAssignRoleRequest;
import com.auth.auth.web.dto.UserCreateRequest;
import com.auth.auth.web.dto.UserResponse;
import com.auth.auth.web.dto.UserUpdateRequest;
import com.auth.auth.web.dto.UserUpdateRolesRequest;
import com.auth.auth.web.routes.ApiRoutes;

import jakarta.validation.Valid;

@RestController
@RequestMapping(ApiRoutes.Users.BASE)
@Validated
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping
    public ResponseEntity<List<UserResponse>> listUsers(@RequestHeader("Authorization") String authorizationHeader) {
        return ResponseEntity.ok(userService.listUsers(authorizationHeader));
    }

    @PostMapping
    public ResponseEntity<UserResponse> createUser(
            @RequestHeader("Authorization") String authorizationHeader,
            @Valid @RequestBody UserCreateRequest request
    ) {
        return ResponseEntity.ok(userService.createUser(authorizationHeader, request));
    }

    @GetMapping(ApiRoutes.Users.BY_ID)
    public ResponseEntity<UserResponse> getUserById(
            @RequestHeader("Authorization") String authorizationHeader,
            @PathVariable UUID userId
    ) {
        return ResponseEntity.ok(userService.getUserById(authorizationHeader, userId));
    }

    @GetMapping(ApiRoutes.Users.BY_ID + "/roles")
    public ResponseEntity<List<RoleResponse>> listUserRoles(
            @RequestHeader("Authorization") String authorizationHeader,
            @PathVariable UUID userId
    ) {
        return ResponseEntity.ok(userService.listUserRoles(authorizationHeader, userId));
    }

    @PostMapping(ApiRoutes.Users.ROLES)
    public ResponseEntity<AuthActionResponse> assignRoleToUser(
            @RequestHeader("Authorization") String authorizationHeader,
            @PathVariable UUID userId,
            @Valid @RequestBody UserAssignRoleRequest request
    ) {
        return ResponseEntity.ok(userService.assignRoleToUser(authorizationHeader, userId, request));
    }

    @DeleteMapping(ApiRoutes.Users.ROLE_BY_ID)
    public ResponseEntity<AuthActionResponse> removeRoleFromUser(
            @RequestHeader("Authorization") String authorizationHeader,
            @PathVariable UUID userId,
            @PathVariable UUID roleId
    ) {
        return ResponseEntity.ok(userService.removeRoleFromUser(authorizationHeader, userId, roleId));
    }

    @PostMapping(ApiRoutes.Users.ROLE_BY_ID)
    public ResponseEntity<AuthActionResponse> removeRoleFromUserWithPost(
            @RequestHeader("Authorization") String authorizationHeader,
            @PathVariable UUID userId,
            @PathVariable UUID roleId
    ) {
        return ResponseEntity.ok(userService.removeRoleFromUser(authorizationHeader, userId, roleId));
    }

    @PatchMapping(ApiRoutes.Users.ROLES)
    public ResponseEntity<List<RoleResponse>> replaceUserRoles(
            @RequestHeader("Authorization") String authorizationHeader,
            @PathVariable UUID userId,
            @Valid @RequestBody UserUpdateRolesRequest request
    ) {
        return ResponseEntity.ok(userService.replaceUserRoles(authorizationHeader, userId, request));
    }

    @PatchMapping(ApiRoutes.Users.BY_ID)
    public ResponseEntity<UserResponse> updateUser(
            @RequestHeader("Authorization") String authorizationHeader,
            @PathVariable UUID userId,
            @RequestBody UserUpdateRequest request
    ) {
        return ResponseEntity.ok(userService.updateUser(authorizationHeader, userId, request));
    }

    @DeleteMapping(ApiRoutes.Users.BY_ID)
    public ResponseEntity<AuthActionResponse> deleteUser(
            @RequestHeader("Authorization") String authorizationHeader,
            @PathVariable UUID userId
    ) {
        return ResponseEntity.ok(userService.deleteUser(authorizationHeader, userId));
    }
}
