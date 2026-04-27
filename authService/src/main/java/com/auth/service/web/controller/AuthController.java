package com.auth.service.web.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.auth.service.service.AuthService;
import com.auth.service.web.dto.AuthActionResponse;
import com.auth.service.web.dto.AuthChangePasswordRequest;
import com.auth.service.web.dto.AuthForgotPasswordRequest;
import com.auth.service.web.dto.AuthLoginRequest;
import com.auth.service.web.dto.AuthLoginResponse;
import com.auth.service.web.dto.AuthLogoutRequest;
import com.auth.service.web.dto.AuthMeResponse;
import com.auth.service.web.dto.AuthRefreshRequest;
import com.auth.service.web.dto.AuthResetPasswordRequest;
import com.auth.service.web.dto.AuthSsoRedirectResponse;
import com.auth.service.web.dto.AuthTokensResponse;
import com.auth.service.web.dto.AuthTwoFaEmailVerifyRequest;
import com.auth.service.web.dto.AuthTwoFaSetupResponse;
import com.auth.service.web.dto.AuthTwoFaVerifyRequest;
import com.auth.service.web.routes.ApiRoutes;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

@RestController
@RequestMapping(ApiRoutes.Auth.BASE)
@Validated
public class AuthController {
    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping(ApiRoutes.Auth.LOGIN)
    public ResponseEntity<AuthLoginResponse> login(@Valid @RequestBody AuthLoginRequest request, HttpServletRequest httpRequest) {
        return ResponseEntity.ok(authService.login(
                request,
                resolveClientIp(httpRequest),
                normalizeHeader(httpRequest.getHeader("User-Agent")),
                normalizeHeader(httpRequest.getHeader("Accept-Language")),
                normalizeHeader(httpRequest.getHeader("X-Client-Timezone"))
        ));
    }

    @PostMapping(ApiRoutes.Auth.TWO_FA_EMAIL_VERIFY)
    public ResponseEntity<AuthLoginResponse> verifyLoginTwoFa(
            @Valid @RequestBody AuthTwoFaEmailVerifyRequest request,
            HttpServletRequest httpRequest
    ) {
        return ResponseEntity.ok(authService.verifyEmailTwoFa(
            request,
            resolveClientIp(httpRequest),
            normalizeHeader(httpRequest.getHeader("User-Agent")),
            normalizeHeader(httpRequest.getHeader("Accept-Language")),
            normalizeHeader(httpRequest.getHeader("X-Client-Timezone"))
        ));
    }

    @PostMapping(ApiRoutes.Auth.REFRESH)
    public ResponseEntity<AuthTokensResponse> refresh(@Valid @RequestBody AuthRefreshRequest request, HttpServletRequest httpRequest) {
        return ResponseEntity.ok(authService.refresh(
                request,
                resolveClientIp(httpRequest),
                normalizeHeader(httpRequest.getHeader("User-Agent")),
                normalizeHeader(httpRequest.getHeader("Accept-Language")),
                normalizeHeader(httpRequest.getHeader("X-Client-Timezone"))
        ));
    }

    private String resolveClientIp(HttpServletRequest httpRequest) {
        String forwardedFor = normalizeHeader(httpRequest.getHeader("X-Forwarded-For"));
        if (forwardedFor != null && !forwardedFor.isBlank()) {
            return forwardedFor.split(",")[0].trim();
        }

        String realIp = normalizeHeader(httpRequest.getHeader("X-Real-IP"));
        if (realIp != null && !realIp.isBlank()) {
            return realIp;
        }

        return httpRequest.getRemoteAddr();
    }

    private String normalizeHeader(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }

    @PostMapping(ApiRoutes.Auth.LOGOUT)
    public ResponseEntity<AuthActionResponse> logout(
            @RequestBody(required = false) AuthLogoutRequest request,
            @RequestHeader(name = "Authorization", required = false) String authorizationHeader
    ) {
        String refreshToken = request == null ? null : request.refreshToken();
        return ResponseEntity.ok(authService.logout(refreshToken, authorizationHeader));
    }

    @GetMapping(ApiRoutes.Auth.ME)
    public ResponseEntity<AuthMeResponse> me(@RequestHeader("Authorization") String authorizationHeader) {
        return ResponseEntity.ok(authService.me(authorizationHeader));
    }

    @PostMapping(ApiRoutes.Auth.CHANGE_PASSWORD)
    public ResponseEntity<AuthActionResponse> changePassword(
            @RequestHeader("Authorization") String authorizationHeader,
            @Valid @RequestBody AuthChangePasswordRequest request
    ) {
        return ResponseEntity.ok(authService.changePassword(authorizationHeader, request));
    }

    @PostMapping(ApiRoutes.Auth.FORGOT_PASSWORD)
    public ResponseEntity<com.service.auth.web.dto.PasswordResetResponse> forgotPassword(
            @Valid @RequestBody AuthForgotPasswordRequest request
    ) {
        return ResponseEntity.ok(authService.forgotPassword(request));
    }

    @PostMapping(ApiRoutes.Auth.RESET_PASSWORD)
    public ResponseEntity<AuthActionResponse> resetPassword(@Valid @RequestBody AuthResetPasswordRequest request) {
        return ResponseEntity.ok(authService.resetPassword(request));
    }

    @GetMapping(ApiRoutes.Auth.SSO_REDIRECT)
    public ResponseEntity<AuthSsoRedirectResponse> ssoRedirect(
            @PathVariable String provider,
            @RequestParam(name = "tenantId", required = false) java.util.UUID tenantId,
            @RequestParam(name = "tenantName", required = false) String tenantName
    ) {
        return ResponseEntity.ok(authService.ssoRedirect(provider, tenantId, tenantName));
    }

    @GetMapping(ApiRoutes.Auth.SSO_CALLBACK)
    public ResponseEntity<AuthLoginResponse> ssoCallback(
            @PathVariable String provider,
            @RequestParam(name = "code", required = false) String code,
            @RequestParam(name = "state", required = false) String state,
            @RequestParam(name = "tenantId", required = false) java.util.UUID tenantId,
            @RequestParam(name = "tenantName", required = false) String tenantName
    ) {
        return ResponseEntity.ok(authService.ssoCallback(provider, code, state, tenantId, tenantName));
    }

    @PostMapping(ApiRoutes.Auth.TWO_FA_SETUP)
    public ResponseEntity<AuthTwoFaSetupResponse> setupTwoFa(@RequestHeader("Authorization") String authorizationHeader) {
        return ResponseEntity.ok(authService.setupTwoFa(authorizationHeader));
    }

    @PostMapping(ApiRoutes.Auth.TWO_FA_VERIFY)
    public ResponseEntity<AuthActionResponse> verifyTwoFa(
            @RequestHeader("Authorization") String authorizationHeader,
            @Valid @RequestBody AuthTwoFaVerifyRequest request
    ) {
        return ResponseEntity.ok(authService.verifyTwoFa(authorizationHeader, request));
    }

    @DeleteMapping(ApiRoutes.Auth.TWO_FA_DISABLE)
    public ResponseEntity<AuthActionResponse> disableTwoFa(@RequestHeader("Authorization") String authorizationHeader) {
        return ResponseEntity.ok(authService.disableTwoFa(authorizationHeader));
    }
}
