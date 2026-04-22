package com.auth.auth.service;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.core.env.Environment;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.auth.auth.domain.AuditLog;
import com.auth.auth.domain.PasswordResetToken;
import com.auth.auth.domain.RolePermission;
import com.auth.auth.domain.Session;
import com.auth.auth.domain.SsoIdentity;
import com.auth.auth.domain.Tenant;
import com.auth.auth.domain.User;
import com.auth.auth.domain.UserRole;
import com.auth.auth.domain.UserStatus;
import com.auth.auth.domain.UserTwoFactor;
import com.auth.auth.exception.BadRequestException;
import com.auth.auth.exception.NotFoundException;
import com.auth.auth.exception.UnauthorizedException;
import com.auth.auth.repository.AuditLogRepository;
import com.auth.auth.repository.PasswordResetTokenRepository;
import com.auth.auth.repository.RolePermissionRepository;
import com.auth.auth.repository.SessionRepository;
import com.auth.auth.repository.SsoIdentityRepository;
import com.auth.auth.repository.TenantRepository;
import com.auth.auth.repository.UserRepository;
import com.auth.auth.repository.UserRoleRepository;
import com.auth.auth.repository.UserTwoFactorRepository;
import com.auth.auth.web.dto.AuthActionResponse;
import com.auth.auth.web.dto.AuthChangePasswordRequest;
import com.auth.auth.web.dto.AuthForgotPasswordRequest;
import com.auth.auth.web.dto.AuthLoginRequest;
import com.auth.auth.web.dto.AuthLoginResponse;
import com.auth.auth.web.dto.AuthMeResponse;
import com.auth.auth.web.dto.AuthRefreshRequest;
import com.auth.auth.web.dto.AuthResetPasswordRequest;
import com.auth.auth.web.dto.AuthSsoRedirectResponse;
import com.auth.auth.web.dto.AuthTokensResponse;
import com.auth.auth.web.dto.AuthTwoFaSetupResponse;
import com.auth.auth.web.dto.AuthTwoFaVerifyRequest;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class AuthService {
    private static final Duration ACCESS_TOKEN_TTL = Duration.ofDays(7);
    private static final Duration REFRESH_TOKEN_TTL = Duration.ofDays(7);
    private static final String TOKEN_TYPE = "Bearer";

    private final UserRepository userRepository;
    private final TenantRepository tenantRepository;
    private final SessionRepository sessionRepository;
    private final UserRoleRepository userRoleRepository;
    private final RolePermissionRepository rolePermissionRepository;
    private final UserTwoFactorRepository userTwoFactorRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final SsoIdentityRepository ssoIdentityRepository;
    private final AuditLogRepository auditLogRepository;
    private final Environment environment;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newHttpClient();

    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    private final Map<String, PendingSsoContext> pendingSsoStates = new ConcurrentHashMap<>();

    private record PendingSsoContext(UUID tenantId, String tenantName) {
    }

    public AuthService(
            UserRepository userRepository,
            TenantRepository tenantRepository,
            SessionRepository sessionRepository,
            UserRoleRepository userRoleRepository,
            RolePermissionRepository rolePermissionRepository,
            UserTwoFactorRepository userTwoFactorRepository,
            PasswordResetTokenRepository passwordResetTokenRepository,
            SsoIdentityRepository ssoIdentityRepository,
            AuditLogRepository auditLogRepository
            ,Environment environment,
            ObjectMapper objectMapper
    ) {
        this.userRepository = userRepository;
        this.tenantRepository = tenantRepository;
        this.sessionRepository = sessionRepository;
        this.userRoleRepository = userRoleRepository;
        this.rolePermissionRepository = rolePermissionRepository;
        this.userTwoFactorRepository = userTwoFactorRepository;
        this.passwordResetTokenRepository = passwordResetTokenRepository;
        this.ssoIdentityRepository = ssoIdentityRepository;
        this.auditLogRepository = auditLogRepository;
        this.environment = environment;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public AuthLoginResponse login(AuthLoginRequest request, String ipAddress) {
        User user = resolveUserForLogin(request);

        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new UnauthorizedException("User account is not active");
        }

        if (!passwordMatches(request.password(), user.getPassword())) {
            throw new UnauthorizedException("Invalid credentials");
        }

        Session session = createSession(user, ipAddress);
        writeAudit(user, user.getTenant(), "AUTH_LOGIN", "LOGIN success");

        return new AuthLoginResponse(toTokens(session), toMeResponse(user));
    }

    @Transactional
    public AuthTokensResponse refresh(AuthRefreshRequest request, String ipAddress) {
        Session existingSession = sessionRepository.findByRefreshToken(request.refreshToken())
                .orElseThrow(() -> new UnauthorizedException("Invalid refresh token"));

        if (existingSession.getRevokedAt() != null) {
            throw new UnauthorizedException("Refresh token already revoked");
        }

        Instant now = Instant.now();
        Instant refreshExpiration = existingSession.getCreatedAt().plus(REFRESH_TOKEN_TTL);
        if (refreshExpiration.isBefore(now)) {
            throw new UnauthorizedException("Refresh token expired");
        }

        existingSession.setRevokedAt(now);
        sessionRepository.save(existingSession);

        Session rotatedSession = createSession(existingSession.getUser(), ipAddress);
        writeAudit(existingSession.getUser(), existingSession.getUser().getTenant(), "AUTH_REFRESH", "Token rotation");

        return toTokens(rotatedSession);
    }

    @Transactional
    public AuthActionResponse logout(String refreshToken, String authorizationHeader) {
        Session session = null;

        if (refreshToken != null && !refreshToken.isBlank()) {
            session = sessionRepository.findByRefreshToken(refreshToken)
                    .orElseThrow(() -> new UnauthorizedException("Invalid refresh token"));
        } else {
            String accessToken = extractBearerToken(authorizationHeader);
            session = sessionRepository.findByAccessToken(accessToken)
                    .orElseThrow(() -> new UnauthorizedException("Invalid access token"));
        }

        if (session.getRevokedAt() == null) {
            session.setRevokedAt(Instant.now());
            sessionRepository.save(session);
        }

        writeAudit(session.getUser(), session.getUser().getTenant(), "AUTH_LOGOUT", "Logout");
        return new AuthActionResponse("Logout successful");
    }

    @Transactional(readOnly = true)
    public AuthMeResponse me(String authorizationHeader) {
        Session session = getValidSessionFromAuthorization(authorizationHeader);
        return toMeResponse(session.getUser());
    }

    @Transactional(readOnly = true)
    public AuthSsoRedirectResponse ssoRedirect(String provider) {
        return ssoRedirect(provider, null, null);
    }

    @Transactional(readOnly = true)
    public AuthSsoRedirectResponse ssoRedirect(String provider, UUID tenantId, String tenantName) {
        String normalizedProvider = normalizeProvider(provider);
        resolveSsoProviderSettings(normalizedProvider);
        String state = UUID.randomUUID().toString();
        pendingSsoStates.put(state, new PendingSsoContext(tenantId, tenantName));

        String redirectUrl = buildAuthorizationUrl(normalizedProvider, state);
        return new AuthSsoRedirectResponse(normalizedProvider, redirectUrl, state);
    }

    @Transactional
    public AuthLoginResponse ssoCallback(String provider, String code, String state, UUID tenantId, String tenantName) {
        String normalizedProvider = normalizeProvider(provider);
        SsoProviderSettings settings = resolveSsoProviderSettings(normalizedProvider);

        if (code == null || code.isBlank()) {
            throw new BadRequestException("Missing authorization code");
        }

        PendingSsoContext flowContext = pendingSsoStates.remove(state);
        if (flowContext != null) {
            if (tenantId == null) {
                tenantId = flowContext.tenantId();
            }
            if (tenantName == null) {
                tenantName = flowContext.tenantName();
            }
        }

        Tenant tenant = resolveTenantForScope(tenantId, tenantName);
        JsonNode tokenResponse = exchangeCodeForTokens(settings, code);
        String accessToken = textValue(tokenResponse, "access_token");
        if (accessToken == null || accessToken.isBlank()) {
            throw new BadRequestException("Unable to exchange authorization code");
        }

        SsoUserProfile profile = fetchUserInfo(settings, accessToken);
        User user = resolveOrCreateSsoUser(normalizedProvider, profile, tenant);

        SsoIdentity ssoIdentity = ssoIdentityRepository.findByProviderAndSubject(normalizedProvider, profile.subject())
                .orElseGet(SsoIdentity::new);
        ssoIdentity.setProvider(normalizedProvider);
        ssoIdentity.setSubject(profile.subject());
        ssoIdentity.setEmail(profile.email());
        ssoIdentity.setTenant(tenant);
        ssoIdentity.setUser(user);
        ssoIdentityRepository.save(ssoIdentity);

        Session session = createSession(user, null);
        writeAudit(user, user.getTenant(), "AUTH_SSO_LOGIN", "SSO login success");
        return new AuthLoginResponse(toTokens(session), toMeResponse(user));
    }

    @Transactional
    public AuthTwoFaSetupResponse setupTwoFa(String authorizationHeader) {
        User user = getValidSessionFromAuthorization(authorizationHeader).getUser();
        String secret = generateSecret();
        List<String> generatedBackupCodes = generateBackupCodes();

        UserTwoFactor userTwoFactor = userTwoFactorRepository.findByUser_Id(user.getId()).orElseGet(UserTwoFactor::new);
        userTwoFactor.setUser(user);
        userTwoFactor.setSecret(secret);
        userTwoFactor.setEnabled(false);
        userTwoFactor.setBackupCodesJson(writeBackupCodes(generatedBackupCodes));
        userTwoFactorRepository.save(userTwoFactor);

        String otpAuthUrl = "otpauth://totp/AuthService:" + user.getEmail() + "?secret=" + secret + "&issuer=AuthService";
        writeAudit(user, user.getTenant(), "AUTH_2FA_SETUP", "2FA setup initiated");

        return new AuthTwoFaSetupResponse(
                secret,
                otpAuthUrl,
                generatedBackupCodes,
                "2FA setup generated. Verify a code to enable 2FA."
        );
    }

    @Transactional
    public AuthActionResponse verifyTwoFa(String authorizationHeader, AuthTwoFaVerifyRequest request) {
        User user = getValidSessionFromAuthorization(authorizationHeader).getUser();
        UserTwoFactor userTwoFactor = userTwoFactorRepository.findByUser_Id(user.getId())
                .orElseThrow(() -> new BadRequestException("2FA is not initialized for this user"));

        String secret = userTwoFactor.getSecret();
        if (secret == null || secret.isBlank()) {
            throw new BadRequestException("2FA is not initialized for this user");
        }

        String code = request.code().trim();
        if (code.length() != 6 || !code.chars().allMatch(Character::isDigit)) {
            throw new BadRequestException("Invalid 2FA code format");
        }

        if (!isValidOtp(secret, code) && !consumeBackupCode(userTwoFactor, code)) {
            throw new UnauthorizedException("Invalid 2FA code");
        }

        userTwoFactor.setEnabled(true);
        userTwoFactorRepository.save(userTwoFactor);
        writeAudit(user, user.getTenant(), "AUTH_2FA_VERIFY", "2FA verified");
        return new AuthActionResponse("2FA verification successful");
    }

    @Transactional
    public AuthActionResponse disableTwoFa(String authorizationHeader) {
        User user = getValidSessionFromAuthorization(authorizationHeader).getUser();
        userTwoFactorRepository.findByUser_Id(user.getId()).ifPresent(userTwoFactorRepository::delete);

        writeAudit(user, user.getTenant(), "AUTH_2FA_DISABLE", "2FA disabled");
        return new AuthActionResponse("2FA disabled");
    }

    @Transactional
    public AuthActionResponse changePassword(String authorizationHeader, AuthChangePasswordRequest request) {
        User user = getValidSessionFromAuthorization(authorizationHeader).getUser();
        if (!passwordMatches(request.currentPassword(), user.getPassword())) {
            throw new UnauthorizedException("Current password is invalid");
        }

        user.setPassword(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);
        revokeAllUserSessions(user.getId());
        writeAudit(user, user.getTenant(), "AUTH_CHANGE_PASSWORD", "Password changed");
        return new AuthActionResponse("Password changed successfully");
    }

    @Transactional
    public com.auth.auth.web.dto.PasswordResetResponse forgotPassword(AuthForgotPasswordRequest request) {
        User user = resolveUserForPasswordReset(request);
        String resetToken = UUID.randomUUID() + UUID.randomUUID().toString().replace("-", "");
        PasswordResetToken token = new PasswordResetToken();
        token.setUser(user);
        token.setTokenHash(hashToken(resetToken));
        token.setExpiresAt(Instant.now().plus(Duration.ofHours(1)));
        passwordResetTokenRepository.save(token);
        writeAudit(user, user.getTenant(), "AUTH_FORGOT_PASSWORD", "Password reset token generated");
        return new com.auth.auth.web.dto.PasswordResetResponse("Password reset token generated", resetToken);
    }

    @Transactional
    public AuthActionResponse resetPassword(AuthResetPasswordRequest request) {
        PasswordResetToken token = passwordResetTokenRepository
                .findByTokenHashAndUsedAtIsNullAndExpiresAtAfter(hashToken(request.token()), Instant.now())
                .orElseThrow(() -> new UnauthorizedException("Invalid or expired reset token"));

        User user = token.getUser();
        user.setPassword(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);

        token.setUsedAt(Instant.now());
        passwordResetTokenRepository.save(token);

        revokeAllUserSessions(user.getId());
        writeAudit(user, user.getTenant(), "AUTH_RESET_PASSWORD", "Password reset completed");
        return new AuthActionResponse("Password reset successful");
    }

    private User resolveUserForLogin(AuthLoginRequest request) {
        String email = normalizeEmail(request.email());

        if (request.tenantId() != null) {
            return userRepository.findByTenant_IdAndEmail(request.tenantId(), email)
                    .orElseThrow(() -> new UnauthorizedException("Invalid credentials"));
        }

        if (request.tenantName() != null && !request.tenantName().isBlank()) {
            Tenant tenant = tenantRepository.findByName(request.tenantName().trim())
                    .orElseThrow(() -> new NotFoundException("Tenant not found"));
            return userRepository.findByTenant_IdAndEmail(tenant.getId(), email)
                    .orElseThrow(() -> new UnauthorizedException("Invalid credentials"));
        }

        List<User> users = userRepository.findByEmail(email);
        if (users.isEmpty()) {
            throw new UnauthorizedException("Invalid credentials");
        }
        if (users.size() > 1) {
            throw new BadRequestException("tenantId or tenantName is required for this email");
        }
        return users.getFirst();
    }

    private Session createSession(User user, String ipAddress) {
        Session session = new Session();
        session.setUser(user);
        session.setAccessToken(generateAccessToken());
        session.setRefreshToken(generateRefreshToken());
        session.setExpirationDate(Instant.now().plus(ACCESS_TOKEN_TTL));
        session.setIpAddress(ipAddress);
        session.setRevokedAt(null);
        return sessionRepository.save(session);
    }

    private AuthTokensResponse toTokens(Session session) {
        return new AuthTokensResponse(
                session.getAccessToken(),
                session.getRefreshToken(),
                TOKEN_TYPE,
                ACCESS_TOKEN_TTL.toSeconds()
        );
    }

    private AuthMeResponse toMeResponse(User user) {
        List<UserRole> userRoles = userRoleRepository.findByUser_Id(user.getId());

        List<String> roles = userRoles.stream()
                .map(userRole -> userRole.getRole().getName())
                .filter(Objects::nonNull)
                .distinct()
                .sorted()
                .toList();

        List<String> permissions = userRoles.stream()
                .map(UserRole::getRole)
                .map(role -> rolePermissionRepository.findByRole_Id(role.getId()))
                .flatMap(List::stream)
                .map(RolePermission::getPermission)
                .map(permission -> permission.getName())
                .filter(Objects::nonNull)
                .distinct()
                .sorted()
                .toList();

        return new AuthMeResponse(
                user.getId(),
                user.getEmail(),
                user.getTenant().getId(),
                user.getTenant().getName(),
                user.getStatus().name(),
                roles,
                permissions,
                userTwoFactorRepository.existsByUser_IdAndEnabledTrue(user.getId())
        );
    }

    private Session getValidSessionFromAuthorization(String authorizationHeader) {
        String accessToken = extractBearerToken(authorizationHeader);
        Session session = sessionRepository.findByAccessToken(accessToken)
                .orElseThrow(() -> new UnauthorizedException("Invalid access token"));

        if (session.getRevokedAt() != null) {
            throw new UnauthorizedException("Session revoked");
        }

        if (session.getExpirationDate().isBefore(Instant.now())) {
            throw new UnauthorizedException("Access token expired");
        }

        return session;
    }

    private String extractBearerToken(String authorizationHeader) {
        if (authorizationHeader == null || authorizationHeader.isBlank()) {
            throw new UnauthorizedException("Missing Authorization header");
        }

        String prefix = TOKEN_TYPE + " ";
        if (!authorizationHeader.startsWith(prefix)) {
            throw new UnauthorizedException("Invalid Authorization header format");
        }

        String token = authorizationHeader.substring(prefix.length()).trim();
        if (token.isBlank()) {
            throw new UnauthorizedException("Missing access token");
        }
        return token;
    }

    private String normalizeEmail(String email) {
        if (email == null || email.isBlank()) {
            throw new BadRequestException("Email is required");
        }
        return email.trim().toLowerCase();
    }

    private String normalizeProvider(String provider) {
        if (provider == null || provider.isBlank()) {
            throw new BadRequestException("Provider is required");
        }
        return provider.trim().toLowerCase();
    }

    private Tenant resolveTenantForScope(UUID tenantId, String tenantName) {
        if (tenantId != null) {
            return tenantRepository.findById(tenantId)
                    .orElseThrow(() -> new NotFoundException("Tenant not found"));
        }
        if (tenantName != null && !tenantName.isBlank()) {
            return tenantRepository.findByName(tenantName.trim())
                    .orElseThrow(() -> new NotFoundException("Tenant not found"));
        }
        throw new BadRequestException("tenantId or tenantName is required for SSO");
    }

    private User resolveUserForPasswordReset(AuthForgotPasswordRequest request) {
        String email = normalizeEmail(request.email());
        if (request.tenantId() != null) {
            return userRepository.findByTenant_IdAndEmail(request.tenantId(), email)
                    .orElseThrow(() -> new NotFoundException("User not found"));
        }
        if (request.tenantName() != null && !request.tenantName().isBlank()) {
            Tenant tenant = tenantRepository.findByName(request.tenantName().trim())
                    .orElseThrow(() -> new NotFoundException("Tenant not found"));
            return userRepository.findByTenant_IdAndEmail(tenant.getId(), email)
                    .orElseThrow(() -> new NotFoundException("User not found"));
        }
        List<User> users = userRepository.findByEmail(email);
        if (users.isEmpty()) {
            throw new NotFoundException("User not found");
        }
        if (users.size() > 1) {
            throw new BadRequestException("tenantId or tenantName is required for this email");
        }
        return users.getFirst();
    }

    private SsoProviderSettings resolveSsoProviderSettings(String provider) {
        String prefix = "auth.sso." + provider + ".";
        String authorizationUri = environment.getProperty(prefix + "authorization-uri");
        String tokenUri = environment.getProperty(prefix + "token-uri");
        String userInfoUri = environment.getProperty(prefix + "user-info-uri");
        String clientId = environment.getProperty(prefix + "client-id");
        String clientSecret = environment.getProperty(prefix + "client-secret");
        String redirectUri = environment.getProperty(prefix + "redirect-uri");
        String scope = environment.getProperty(prefix + "scope", "openid email profile");

        if (authorizationUri == null || tokenUri == null || userInfoUri == null || clientId == null || clientSecret == null || redirectUri == null) {
            throw new BadRequestException("SSO provider is not configured: " + provider);
        }

        return new SsoProviderSettings(authorizationUri, tokenUri, userInfoUri, clientId, clientSecret, redirectUri, scope);
    }

    private String buildAuthorizationUrl(String provider, String state) {
        SsoProviderSettings settings = resolveSsoProviderSettings(provider);
        StringBuilder builder = new StringBuilder(settings.authorizationUri())
                .append(settings.authorizationUri().contains("?") ? "&" : "?")
                .append("response_type=code")
                .append("&client_id=").append(urlEncode(settings.clientId()))
                .append("&redirect_uri=").append(urlEncode(settings.redirectUri()))
                .append("&scope=").append(urlEncode(settings.scope()))
                .append("&state=").append(urlEncode(state));
        return builder.toString();
    }

    private JsonNode exchangeCodeForTokens(SsoProviderSettings settings, String code) {
        try {
            String form = "grant_type=authorization_code"
                    + "&code=" + urlEncode(code)
                    + "&redirect_uri=" + urlEncode(settings.redirectUri())
                    + "&client_id=" + urlEncode(settings.clientId())
                    + "&client_secret=" + urlEncode(settings.clientSecret());

            HttpRequest request = HttpRequest.newBuilder(URI.create(settings.tokenUri()))
                    .header("Content-Type", "application/x-www-form-urlencoded")
                    .header("Accept", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(form))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new BadRequestException("SSO token exchange failed");
            }
            return objectMapper.readTree(response.body());
        } catch (Exception exception) {
            throw new BadRequestException("SSO token exchange failed");
        }
    }

    private SsoUserProfile fetchUserInfo(SsoProviderSettings settings, String accessToken) {
        try {
            HttpRequest request = HttpRequest.newBuilder(URI.create(settings.userInfoUri()))
                    .header("Authorization", "Bearer " + accessToken)
                    .header("Accept", "application/json")
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new BadRequestException("Unable to read SSO user profile");
            }

            JsonNode profile = objectMapper.readTree(response.body());
            String subject = textValue(profile, "sub");
            String email = textValue(profile, "email");
            String name = textValue(profile, "name");
            if (subject == null || email == null) {
                throw new BadRequestException("SSO profile is missing subject or email");
            }
            return new SsoUserProfile(subject, email, name);
        } catch (Exception exception) {
            throw new BadRequestException("Unable to read SSO user profile");
        }
    }

    private User resolveOrCreateSsoUser(String provider, SsoUserProfile profile, Tenant tenant) {
        return ssoIdentityRepository.findByProviderAndSubject(provider, profile.subject())
                .map(SsoIdentity::getUser)
                .orElseGet(() -> {
                    User user = userRepository.findByTenant_IdAndEmail(tenant.getId(), profile.email().toLowerCase())
                            .orElseGet(() -> {
                                User createdUser = new User();
                                createdUser.setTenant(tenant);
                                createdUser.setEmail(profile.email().toLowerCase());
                                createdUser.setPassword(passwordEncoder.encode(UUID.randomUUID().toString()));
                                createdUser.setStatus(UserStatus.ACTIVE);
                                return userRepository.save(createdUser);
                            });
                    return user;
                });
    }

    private String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return java.util.HexFormat.of().formatHex(digest.digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 algorithm is not available", exception);
        }
    }

    private String textValue(JsonNode node, String field) {
        JsonNode value = node.get(field);
        return value == null || value.isNull() ? null : value.asText();
    }

    private String urlEncode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    private void revokeAllUserSessions(UUID userId) {
        sessionRepository.findByUser_Id(userId).forEach(session -> {
            if (session.getRevokedAt() == null) {
                session.setRevokedAt(Instant.now());
                sessionRepository.save(session);
            }
        });
    }

    private String writeBackupCodes(List<String> codes) {
        try {
            return objectMapper.writeValueAsString(codes);
        } catch (Exception exception) {
            throw new IllegalStateException("Unable to store backup codes", exception);
        }
    }

    private boolean consumeBackupCode(UserTwoFactor userTwoFactor, String providedCode) {
        String backupCodesJson = userTwoFactor.getBackupCodesJson();
        if (backupCodesJson == null || backupCodesJson.isBlank()) {
            return false;
        }
        try {
            List<String> codes = objectMapper.readValue(
                    backupCodesJson,
                    objectMapper.getTypeFactory().constructCollectionType(List.class, String.class)
            );
            boolean removed = codes.remove(providedCode.trim().toUpperCase());
            if (removed) {
                userTwoFactor.setBackupCodesJson(writeBackupCodes(codes));
                userTwoFactorRepository.save(userTwoFactor);
            }
            return removed;
        } catch (Exception exception) {
            return false;
        }
    }

    private record SsoProviderSettings(String authorizationUri, String tokenUri, String userInfoUri, String clientId, String clientSecret, String redirectUri, String scope) {
    }

    private record SsoUserProfile(String subject, String email, String name) {
    }

    private boolean passwordMatches(String rawPassword, String storedPassword) {
        if (rawPassword == null || storedPassword == null) {
            return false;
        }
        if (storedPassword.startsWith("$2a$") || storedPassword.startsWith("$2b$") || storedPassword.startsWith("$2y$")) {
            return passwordEncoder.matches(rawPassword, storedPassword);
        }
        return storedPassword.equals(rawPassword);
    }

    private String generateAccessToken() {
        return "atk_" + UUID.randomUUID().toString().replace("-", "") + UUID.randomUUID().toString().replace("-", "");
    }

    private String generateRefreshToken() {
        return "rtk_" + UUID.randomUUID().toString().replace("-", "") + UUID.randomUUID().toString().replace("-", "");
    }

    private String generateSecret() {
        byte[] random = UUID.randomUUID().toString().getBytes(StandardCharsets.UTF_8);
        return Base64.getEncoder().withoutPadding().encodeToString(random).substring(0, 24).toUpperCase();
    }

    private List<String> generateBackupCodes() {
        List<String> codes = new ArrayList<>(8);
        for (int i = 0; i < 8; i++) {
            String raw = UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase();
            codes.add(raw);
        }
        return codes.stream().sorted(Comparator.naturalOrder()).toList();
    }

    private boolean isValidOtp(String secret, String providedCode) {
        long window = Instant.now().getEpochSecond() / 30;
        return providedCode.equals(generateOtp(secret, window))
                || providedCode.equals(generateOtp(secret, window - 1));
    }

    private String generateOtp(String secret, long timeWindow) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            String payload = secret + ":" + timeWindow;
            byte[] hash = digest.digest(payload.getBytes(StandardCharsets.UTF_8));
            int value = (hash[0] & 0x7F) << 24 | (hash[1] & 0xFF) << 16 | (hash[2] & 0xFF) << 8 | (hash[3] & 0xFF);
            int otp = value % 1_000_000;
            return String.format("%06d", otp);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 algorithm is not available", exception);
        }
    }

    private void writeAudit(User user, Tenant tenant, String action, String details) {
        AuditLog auditLog = new AuditLog();
        auditLog.setUser(user);
        auditLog.setTenant(tenant);
        auditLog.setAction(action);
        auditLog.setDetails(details);
        auditLog.setResource("auth");
        auditLog.setResourceId(user.getId().toString());
        auditLogRepository.save(auditLog);
    }
}
