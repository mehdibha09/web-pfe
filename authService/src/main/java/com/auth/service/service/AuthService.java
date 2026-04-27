package com.auth.service.service;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.core.env.Environment;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.auth.service.domain.AuditLog;
import com.auth.service.domain.PasswordResetToken;
import com.auth.service.domain.RolePermission;
import com.auth.service.domain.Session;
import com.auth.service.domain.SsoIdentity;
import com.auth.service.domain.Tenant;
import com.auth.service.domain.User;
import com.auth.service.domain.UserRole;
import com.auth.service.domain.UserStatus;
import com.auth.service.domain.UserTwoFactor;
import com.auth.service.exception.BadRequestException;
import com.auth.service.exception.InvalidCredentialsException;
import com.auth.service.exception.NotFoundException;
import com.auth.service.exception.UnauthorizedException;
import com.auth.service.repository.AuditLogRepository;
import com.auth.service.repository.PasswordResetTokenRepository;
import com.auth.service.repository.RolePermissionRepository;
import com.auth.service.repository.SessionRepository;
import com.auth.service.repository.SsoIdentityRepository;
import com.auth.service.repository.TenantRepository;
import com.auth.service.repository.UserRepository;
import com.auth.service.repository.UserRoleRepository;
import com.auth.service.repository.UserTwoFactorRepository;
import com.auth.service.web.dto.AuthActionResponse;
import com.auth.service.web.dto.AuthChangePasswordRequest;
import com.auth.service.web.dto.AuthForgotPasswordRequest;
import com.auth.service.web.dto.AuthLoginRequest;
import com.auth.service.web.dto.AuthLoginResponse;
import com.auth.service.web.dto.AuthMeResponse;
import com.auth.service.web.dto.AuthRefreshRequest;
import com.auth.service.web.dto.AuthResetPasswordRequest;
import com.auth.service.web.dto.AuthSsoRedirectResponse;
import com.auth.service.web.dto.AuthTokensResponse;
import com.auth.service.web.dto.AuthTwoFaEmailVerifyRequest;
import com.auth.service.web.dto.AuthTwoFaSetupResponse;
import com.auth.service.web.dto.AuthTwoFaVerifyRequest;
import com.auth.service.web.dto.AuthUpdateEmailRequest;
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
    private final EmailService emailService;
    private final HttpClient httpClient = HttpClient.newHttpClient();
    private final SecureRandom secureRandom = new SecureRandom();

    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    private final Map<String, PendingSsoContext> pendingSsoStates = new ConcurrentHashMap<>();
    private final Map<String, PendingEmailTwoFaContext> pendingEmailTwoFaChallenges = new ConcurrentHashMap<>();
    private final Map<UUID, PendingEmailTwoFaContext> pendingTwoFaSetupChallenges = new ConcurrentHashMap<>();

    private record PendingSsoContext(UUID tenantId, String tenantName) {
    }

    private record PendingEmailTwoFaContext(UUID userId, String codeHash, Instant expiresAt) {
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
            AuditLogRepository auditLogRepository,
            Environment environment,
            ObjectMapper objectMapper,
            EmailService emailService
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
        this.emailService = emailService;
    }

    @Transactional
        public AuthLoginResponse login(
            AuthLoginRequest request,
            String ipAddress,
            String userAgent,
            String acceptLanguage,
            String clientTimezone
        ) {
        User user = resolveUserForLogin(request);

        if (!passwordMatches(request.password(), user.getPassword())) {
            throw new InvalidCredentialsException("Invalid credentials");
        }

        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new InvalidCredentialsException("Invalid credentials");
        }

        if (userTwoFactorRepository.existsByUser_IdAndEnabledTrue(user.getId())) {
            String code = generateEmailTwoFaCode();
            String normalizedEmail = normalizeEmail(user.getEmail());
            pendingEmailTwoFaChallenges.put(
                normalizedEmail,
                    new PendingEmailTwoFaContext(user.getId(), hashToken(code), Instant.now().plus(Duration.ofMinutes(10)))
            );
            emailService.sendLoginTwoFaCodeEmail(user.getEmail(), user.getEmail(), code, 10);
            writeAudit(user, user.getTenant(), "AUTH_LOGIN_2FA_EMAIL", "Email 2FA code sent");

            return new AuthLoginResponse(
                    null,
                    toMeResponse(user),
                    true,
                    "A verification code has been sent to your email address"
            );
        }

        Session session = createSession(user, ipAddress, userAgent, acceptLanguage, clientTimezone);
        writeAudit(user, user.getTenant(), "AUTH_LOGIN", "LOGIN success");

        return new AuthLoginResponse(toTokens(session), toMeResponse(user), false, null);
    }

    @Transactional
        public AuthLoginResponse verifyEmailTwoFa(
            AuthTwoFaEmailVerifyRequest request,
            String ipAddress,
            String userAgent,
            String acceptLanguage,
            String clientTimezone
        ) {
        String normalizedEmail = normalizeEmail(request.email());
        String providedCode = request.code() == null ? "" : request.code().trim();

        if (!providedCode.matches("\\d{6}")) {
            throw new BadRequestException("Invalid verification code format");
        }

        PendingEmailTwoFaContext challenge = pendingEmailTwoFaChallenges.get(normalizedEmail);
        if (challenge == null) {
            throw new UnauthorizedException("Invalid or expired verification challenge");
        }

        if (challenge.expiresAt().isBefore(Instant.now())) {
            pendingEmailTwoFaChallenges.remove(normalizedEmail);
            throw new UnauthorizedException("Invalid or expired verification challenge");
        }

        if (!hashToken(providedCode).equals(challenge.codeHash())) {
            throw new UnauthorizedException("Invalid verification code");
        }

        pendingEmailTwoFaChallenges.remove(normalizedEmail);

        User user = userRepository.findById(challenge.userId())
                .orElseThrow(() -> new UnauthorizedException("Invalid verification challenge"));

        Session session = createSession(user, ipAddress, userAgent, acceptLanguage, clientTimezone);
        writeAudit(user, user.getTenant(), "AUTH_LOGIN_2FA_EMAIL_VERIFY", "Email 2FA verified");

        return new AuthLoginResponse(toTokens(session), toMeResponse(user), false, "Login successful");
    }

    @Transactional
        public AuthTokensResponse refresh(
            AuthRefreshRequest request,
            String ipAddress,
            String userAgent,
            String acceptLanguage,
            String clientTimezone
        ) {
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

        Session rotatedSession = createSession(existingSession.getUser(), ipAddress, userAgent, acceptLanguage, clientTimezone);
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

        Session session = createSession(user, null, null, null, null);
        writeAudit(user, user.getTenant(), "AUTH_SSO_LOGIN", "SSO login success");
        return new AuthLoginResponse(toTokens(session), toMeResponse(user), false, null);
    }

    @Transactional
    public AuthTwoFaSetupResponse setupTwoFa(String authorizationHeader) {
        User user = getValidSessionFromAuthorization(authorizationHeader).getUser();
        String code = generateEmailTwoFaCode();

        pendingTwoFaSetupChallenges.put(
            user.getId(),
                new PendingEmailTwoFaContext(user.getId(), hashToken(code), Instant.now().plus(Duration.ofMinutes(10)))
        );

        writeAudit(user, user.getTenant(), "AUTH_2FA_SETUP", "2FA setup initiated");
        emailService.sendTwoFaSetupCodeEmail(user.getEmail(), user.getEmail(), code, 10);

        return new AuthTwoFaSetupResponse(
                6,
                "A 6-digit activation code has been sent to your email address"
        );
    }

    @Transactional
    public AuthActionResponse verifyTwoFa(String authorizationHeader, AuthTwoFaVerifyRequest request) {
        User user = getValidSessionFromAuthorization(authorizationHeader).getUser();
        PendingEmailTwoFaContext challenge = pendingTwoFaSetupChallenges.get(user.getId());
        if (challenge == null || !challenge.userId().equals(user.getId())) {
            throw new UnauthorizedException("Invalid or expired 2FA activation challenge");
        }

        if (challenge.expiresAt().isBefore(Instant.now())) {
            pendingTwoFaSetupChallenges.remove(user.getId());
            throw new UnauthorizedException("Invalid or expired 2FA activation challenge");
        }

        String code = request.code().trim();
        if (code.length() != 6 || !code.chars().allMatch(Character::isDigit)) {
            throw new BadRequestException("Invalid 2FA code format");
        }

        if (!hashToken(code).equals(challenge.codeHash())) {
            throw new UnauthorizedException("Invalid 2FA code");
        }

        pendingTwoFaSetupChallenges.remove(user.getId());

        UserTwoFactor userTwoFactor = userTwoFactorRepository.findByUser_Id(user.getId()).orElseGet(UserTwoFactor::new);
        userTwoFactor.setSecret(UUID.randomUUID().toString());
        userTwoFactor.setEnabled(true);
        userTwoFactor.setUser(user);
        userTwoFactorRepository.save(userTwoFactor);
        writeAudit(user, user.getTenant(), "AUTH_2FA_VERIFY", "2FA verified");
        
        // Send 2FA verification notification
        emailService.send2FAVerificationNotification(user.getEmail(), user.getEmail());
        
        return new AuthActionResponse("2FA verification successful");
    }

    @Transactional
    public AuthActionResponse disableTwoFa(String authorizationHeader) {
        User user = getValidSessionFromAuthorization(authorizationHeader).getUser();
        pendingTwoFaSetupChallenges.remove(user.getId());
        userTwoFactorRepository.findByUser_Id(user.getId()).ifPresent(userTwoFactorRepository::delete);

        writeAudit(user, user.getTenant(), "AUTH_2FA_DISABLE", "2FA disabled");
        
        // Send 2FA disabled notification email
        emailService.send2FADisabledEmail(user.getEmail(), user.getEmail());
        
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
        
        // Send password change confirmation email
        emailService.sendPasswordChangeEmail(user.getEmail(), user.getEmail());
        
        return new AuthActionResponse("Password changed successfully");
    }

    public AuthActionResponse updateEmail(String authorizationHeader, AuthUpdateEmailRequest request) {
        User user = getValidSessionFromAuthorization(authorizationHeader).getUser();
        
        if (!passwordMatches(request.password(), user.getPassword())) {
            throw new UnauthorizedException("Password is invalid");
        }

        String newEmail = request.newEmail().toLowerCase().trim();
        
        if (newEmail.equals(user.getEmail())) {
            throw new BadRequestException("New email must be different from current email");
        }

        List<User> existingUsers = userRepository.findByEmail(newEmail);
        if (!existingUsers.isEmpty()) {
            throw new BadRequestException("Email already in use");
        }

        String oldEmail = user.getEmail();
        user.setEmail(newEmail);
        userRepository.save(user);
        
        writeAudit(user, user.getTenant(), "AUTH_UPDATE_EMAIL", "Email changed from " + oldEmail + " to " + newEmail);
        
        // Send email change confirmation emails
        emailService.sendPasswordChangeEmail(newEmail, oldEmail);
        
        return new AuthActionResponse("Email updated successfully");
    }

    @Transactional
    public com.auth.service.web.dto.PasswordResetResponse forgotPassword(AuthForgotPasswordRequest request) {
        User user = resolveUserForPasswordReset(request);
        String resetToken = UUID.randomUUID() + UUID.randomUUID().toString().replace("-", "");
        PasswordResetToken token = new PasswordResetToken();
        token.setUser(user);
        token.setTokenHash(hashToken(resetToken));
        token.setExpiresAt(Instant.now().plus(Duration.ofHours(1)));
        passwordResetTokenRepository.save(token);
        writeAudit(user, user.getTenant(), "AUTH_FORGOT_PASSWORD", "Password reset token generated");
        
        // Send password reset email
        emailService.sendPasswordResetEmail(user.getEmail(), resetToken, user.getEmail());
        
        return new com.auth.service.web.dto.PasswordResetResponse("Password reset token generated", resetToken);
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
        
        // Send password change confirmation email
        emailService.sendPasswordChangeEmail(user.getEmail(), user.getEmail());
        writeAudit(user, user.getTenant(), "AUTH_RESET_PASSWORD", "Password reset completed");
        return new AuthActionResponse("Password reset successful");
    }

    private User resolveUserForLogin(AuthLoginRequest request) {
        String email = normalizeEmail(request.email());

        if (request.tenantId() != null) {
            return userRepository.findByTenant_IdAndEmail(request.tenantId(), email)
                    .orElseThrow(() -> new InvalidCredentialsException("Invalid credentials"));
        }

        if (request.tenantName() != null && !request.tenantName().isBlank()) {
            Tenant tenant = tenantRepository.findByName(request.tenantName().trim())
                .orElseThrow(() -> new InvalidCredentialsException("Invalid credentials"));
            return userRepository.findByTenant_IdAndEmail(tenant.getId(), email)
                    .orElseThrow(() -> new InvalidCredentialsException("Invalid credentials"));
        }

        List<User> users = userRepository.findByEmail(email);
        if (users.isEmpty()) {
            throw new InvalidCredentialsException("Invalid credentials");
        }
        if (users.size() > 1) {
            throw new BadRequestException("tenantId or tenantName is required for this email");
        }
        return users.getFirst();
    }

    private Session createSession(
            User user,
            String ipAddress,
            String userAgent,
            String acceptLanguage,
            String clientTimezone
    ) {
        Session session = new Session();
        session.setUser(user);
        session.setAccessToken(generateAccessToken());
        session.setRefreshToken(generateRefreshToken());
        session.setExpirationDate(Instant.now().plus(ACCESS_TOKEN_TTL));
        session.setIpAddress(ipAddress);
        session.setBrowser(resolveBrowser(userAgent));
        session.setOs(resolveOperatingSystem(userAgent));
        session.setLocalization(resolveLocalization(acceptLanguage, clientTimezone));
        session.setRevokedAt(null);
        return sessionRepository.save(session);
    }

    private String resolveBrowser(String userAgent) {
        if (userAgent == null || userAgent.isBlank()) {
            return "Unknown";
        }

        String normalized = userAgent.toLowerCase();
        if (normalized.contains("edg/")) return "Microsoft Edge";
        if (normalized.contains("opr/") || normalized.contains("opera")) return "Opera";
        if (normalized.contains("chrome/")) return "Google Chrome";
        if (normalized.contains("safari/") && !normalized.contains("chrome/")) return "Safari";
        if (normalized.contains("firefox/")) return "Firefox";
        if (normalized.contains("msie") || normalized.contains("trident/")) return "Internet Explorer";
        return "Unknown";
    }

    private String resolveOperatingSystem(String userAgent) {
        if (userAgent == null || userAgent.isBlank()) {
            return "Unknown";
        }

        String normalized = userAgent.toLowerCase();
        if (normalized.contains("windows")) return "Windows";
        if (normalized.contains("mac os") || normalized.contains("macintosh")) return "macOS";
        if (normalized.contains("android")) return "Android";
        if (normalized.contains("iphone") || normalized.contains("ipad") || normalized.contains("ios")) return "iOS";
        if (normalized.contains("linux")) return "Linux";
        return "Unknown";
    }

    private String resolveLocalization(String acceptLanguage, String clientTimezone) {
        String language = null;
        if (acceptLanguage != null && !acceptLanguage.isBlank()) {
            language = acceptLanguage.split(",")[0].trim();
        }

        String timezone = clientTimezone == null ? null : clientTimezone.trim();
        if (timezone != null && timezone.isBlank()) {
            timezone = null;
        }

        if (timezone != null && language != null && !language.isBlank()) {
            return timezone + " | " + language;
        }
        if (timezone != null) {
            return timezone;
        }
        if (language != null && !language.isBlank()) {
            return language;
        }
        return "Unknown";
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

    private String generateEmailTwoFaCode() {
        int code = secureRandom.nextInt(1_000_000);
        return String.format("%06d", code);
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
