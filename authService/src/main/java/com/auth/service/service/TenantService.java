package com.auth.service.service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import com.auth.service.domain.AuditLog;
import com.auth.service.domain.Permission;
import com.auth.service.domain.Role;
import com.auth.service.domain.RolePermission;
import com.auth.service.domain.RolePermissionId;
import com.auth.service.domain.Session;
import com.auth.service.domain.Tenant;
import com.auth.service.domain.TenantStatus;
import com.auth.service.domain.User;
import com.auth.service.domain.UserRole;
import com.auth.service.domain.UserRoleId;
import com.auth.service.domain.UserStatus;
import com.auth.service.exception.BadRequestException;
import com.auth.service.exception.ConflictException;
import com.auth.service.exception.ForbiddenException;
import com.auth.service.exception.NotFoundException;
import com.auth.service.exception.UnauthorizedException;
import com.auth.service.repository.AuditLogRepository;
import com.auth.service.repository.PermissionRepository;
import com.auth.service.repository.RolePermissionRepository;
import com.auth.service.repository.RoleRepository;
import com.auth.service.repository.SessionRepository;
import com.auth.service.repository.TenantRepository;
import com.auth.service.repository.UserRepository;
import com.auth.service.repository.UserRoleRepository;

import jakarta.servlet.http.HttpServletRequest;
import com.auth.service.web.dto.role.RoleResponse;
import com.auth.service.web.dto.tenant.TenantCreateRequest;
import com.auth.service.web.dto.tenant.TenantResponse;
import com.auth.service.web.dto.tenant.TenantUpdateRequest;
import com.auth.service.web.dto.user.UserResponse;

@Service
public class TenantService {
    private static final String TOKEN_TYPE = "Bearer";
    private static final String SUPER_ADMIN_ROLE = "super-admin";
    private static final String DEFAULT_ADMIN_ROLE_NAME = "admin";
    private static final Logger log = LoggerFactory.getLogger(TenantService.class);

    private final TenantRepository tenantRepository;
    private final SessionRepository sessionRepository;
    private final UserRoleRepository userRoleRepository;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;
    private final AuditLogRepository auditLogRepository;
    private final RolePermissionRepository rolePermissionRepository;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    @Value("${deployment-service-url}")
    private String deploymentServiceUrl;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();

    public TenantService(
            TenantRepository tenantRepository,
            SessionRepository sessionRepository,
            UserRoleRepository userRoleRepository,
                UserRepository userRepository,
                RoleRepository roleRepository,
                PermissionRepository permissionRepository,
            AuditLogRepository auditLogRepository,
            RolePermissionRepository rolePermissionRepository
    ) {
        this.tenantRepository = tenantRepository;
        this.sessionRepository = sessionRepository;
        this.userRoleRepository = userRoleRepository;
            this.userRepository = userRepository;
            this.roleRepository = roleRepository;
            this.permissionRepository = permissionRepository;
        this.auditLogRepository = auditLogRepository;
        this.rolePermissionRepository = rolePermissionRepository;
    }

            @Transactional(readOnly = true)
            public List<UserResponse> listTenantUsers(String authorizationHeader, UUID tenantId) {
            User currentUser = requireCurrentUser(authorizationHeader);
            Tenant tenant = requireTenant(tenantId);
            ensureTenantAccess(currentUser, tenant);

            return userRepository.findByTenant_Id(tenant.getId())
                .stream()
                .map(user -> new UserResponse(
                    user.getId(),
                    user.getEmail(),
                    user.getStatus().name(),
                    user.getTenant().getId(),
                    user.getTenant().getName(),
                    user.getCreatedAt(),
                    user.getUpdatedAt()
                ))
                .toList();
            }

            @Transactional(readOnly = true)
            public List<RoleResponse> listTenantRoles(String authorizationHeader, UUID tenantId) {
            User currentUser = requireCurrentUser(authorizationHeader);
            Tenant tenant = requireTenant(tenantId);
            ensureTenantAccess(currentUser, tenant);

            return roleRepository.findByTenant_Id(tenant.getId())
                .stream()
                .map(role -> new RoleResponse(
                    role.getId(),
                    role.getName(),
                    role.getDescription(),
                    role.getTenant().getId(),
                    role.getCreatedAt(),
                    List.of()
                ))
                .toList();
            }

    @Transactional(readOnly = true)
    public List<TenantResponse> listTenants(String authorizationHeader) {
        User currentUser = requireCurrentUser(authorizationHeader);
        requireSuperAdminOrTenantManage(currentUser);

        return tenantRepository.findAll()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public Page<TenantResponse> listTenants(String authorizationHeader, Pageable pageable) {
        User currentUser = requireCurrentUser(authorizationHeader);
        requireSuperAdminOrTenantManage(currentUser);
        return tenantRepository.findAll(pageable).map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public TenantResponse getTenantById(String authorizationHeader, UUID tenantId) {
        User currentUser = requireCurrentUser(authorizationHeader);
        Tenant tenant = requireTenant(tenantId);

        if (!isSuperAdmin(currentUser) && !tenant.getId().equals(currentUser.getTenant().getId())) {
            throw new ForbiddenException("Tenant belongs to another scope");
        }

        return toResponse(tenant);
    }

    @Transactional
    public TenantResponse createTenant(String authorizationHeader, TenantCreateRequest request) {
        User currentUser = requireCurrentUser(authorizationHeader);
        requireSuperAdminOrTenantManage(currentUser);

        String tenantName = normalizeName(request.name());
        tenantRepository.findByNameIgnoreCase(tenantName)
                .ifPresent(existing -> {
                    throw new ConflictException("Tenant already exists");
                });

        Tenant tenant = new Tenant();
        tenant.setName(tenantName);
        tenant.setCode(generateUniqueTenantCode(tenantName));
        tenant.setContactEmail(normalizeNullable(request.contactEmail()));
        tenant.setPhone(normalizeNullable(request.phone()));
        tenant.setModeDeployment(normalizeNullable(request.modeDeployment()));
        tenant.setStatus(parseStatusOrDefault(request.status(), TenantStatus.ACTIVE));

        Tenant savedTenant = tenantRepository.save(tenant);
        writeAudit(currentUser, "TENANT_CREATE", "Tenant created", savedTenant.getId().toString());

        createNamespaceForTenant(savedTenant, authorizationHeader);

        if (request.adminEmail() != null && !request.adminEmail().isBlank()
                && request.adminPassword() != null && !request.adminPassword().isBlank()) {
            createAdminUserForTenant(savedTenant, request.adminEmail(), request.adminPassword(), authorizationHeader);
        }

        return toResponse(savedTenant);
    }

    @Transactional
    protected User createAdminUserForTenant(Tenant tenant, String adminEmail, String adminPassword, String authorizationHeader) {
        String email = adminEmail.trim().toLowerCase();

        userRepository.findByEmail(email).stream().findFirst().ifPresent(existing -> {
            throw new ConflictException("Email already exists");
        });

        Role adminRole = roleRepository.findByTenant_IdAndName(tenant.getId(), DEFAULT_ADMIN_ROLE_NAME)
                .orElseGet(() -> {
                    Role role = new Role();
                    role.setTenant(tenant);
                    role.setName(DEFAULT_ADMIN_ROLE_NAME);
                    role.setDescription("Tenant administrator");
                    Role savedRole = roleRepository.save(role);

                    List<Permission> allPermissions = permissionRepository.findAll();
                    for (Permission permission : allPermissions) {
                        RolePermission rp = new RolePermission();
                        rp.setId(new RolePermissionId(savedRole.getId(), permission.getId()));
                        rp.setRole(savedRole);
                        rp.setPermission(permission);
                        rolePermissionRepository.save(rp);
                    }

                    return savedRole;
                });

        User user = new User();
        user.setTenant(tenant);
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(adminPassword));
        user.setStatus(UserStatus.ACTIVE);
        User savedUser = userRepository.save(user);

        UserRole userRole = new UserRole();
        userRole.setId(new UserRoleId(savedUser.getId(), adminRole.getId()));
        userRole.setUser(savedUser);
        userRole.setRole(adminRole);
        userRoleRepository.save(userRole);

        writeAudit(findCurrentUserSafe(authorizationHeader), "TENANT_ADMIN_CREATED",
                "Admin user created for tenant", savedUser.getId().toString());

        return savedUser;
    }

    private User findCurrentUserSafe(String authorizationHeader) {
        try {
            return requireCurrentUser(authorizationHeader);
        } catch (Exception e) {
            return null;
        }
    }

    private void createNamespaceForTenant(Tenant tenant, String authorizationHeader) {
        try {
            String namespaceName = "tenant-" + tenant.getId().toString().substring(0, 8).toLowerCase();
            String body = "{\"name\":\"" + namespaceName + "\"}";

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(deploymentServiceUrl + "/api/v1/k8s/namespaces"))
                    .header("Content-Type", "application/json")
                    .header("Authorization", authorizationHeader)
                    .timeout(Duration.ofSeconds(10))
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                log.info("K8s namespace '{}' created for tenant '{}'", namespaceName, tenant.getName());
            } else {
                log.warn("Failed to create K8s namespace '{}' for tenant '{}': HTTP {} - {}",
                        namespaceName, tenant.getName(), response.statusCode(), response.body());
            }
        } catch (Exception e) {
            log.warn("Could not create K8s namespace for tenant '{}': {}", tenant.getName(), e.getMessage());
        }
    }

    @Transactional
    public TenantResponse updateTenant(String authorizationHeader, UUID tenantId, TenantUpdateRequest request) {
        User currentUser = requireCurrentUser(authorizationHeader);
        requireSuperAdminOrTenantManage(currentUser);

        Tenant tenant = requireTenant(tenantId);

        if (request.name() != null && !request.name().isBlank()) {
            String updatedName = normalizeName(request.name());
            if (!updatedName.equalsIgnoreCase(tenant.getName())) {
                tenantRepository.findByNameIgnoreCase(updatedName)
                        .ifPresent(existing -> {
                            throw new ConflictException("Tenant name already exists");
                        });
                tenant.setName(updatedName);
            }
        }

        if (request.contactEmail() != null) {
            tenant.setContactEmail(normalizeNullable(request.contactEmail()));
        }

        if (request.phone() != null) {
            tenant.setPhone(normalizeNullable(request.phone()));
        }

        if (request.modeDeployment() != null) {
            tenant.setModeDeployment(normalizeNullable(request.modeDeployment()));
        }

        if (request.status() != null && !request.status().isBlank()) {
            tenant.setStatus(parseStatusOrDefault(request.status(), tenant.getStatus()));
        }

        Tenant savedTenant = tenantRepository.save(tenant);
        writeAudit(currentUser, "TENANT_UPDATE", "Tenant updated", savedTenant.getId().toString());
        return toResponse(savedTenant);
    }

    @Transactional
    public TenantResponse disableTenant(String authorizationHeader, UUID tenantId) {
        User currentUser = requireCurrentUser(authorizationHeader);
        requireSuperAdminOrTenantManage(currentUser);

        Tenant tenant = requireTenant(tenantId);
        tenant.setStatus(TenantStatus.DELETED);

        Tenant savedTenant = tenantRepository.save(tenant);
        writeAudit(currentUser, "TENANT_DELETE", "Tenant disabled", savedTenant.getId().toString());

        deprovisionTenant(tenantId, authorizationHeader);

        return toResponse(savedTenant);
    }

    /**
     * Best-effort deprovisioning when a tenant is disabled: revokes every
     * session belonging to the tenant and requests the deployment service to
     * delete the tenant's Kubernetes namespace. Failures are logged but never
     * block the tenant disablement.
     */
    private void deprovisionTenant(UUID tenantId, String authorizationHeader) {
        try {
            List<Session> tenantSessions = sessionRepository.findAllByTenant_Id(tenantId);
            for (Session session : tenantSessions) {
                session.setRevokedAt(Instant.now());
                sessionRepository.save(session);
            }
            if (!tenantSessions.isEmpty()) {
                log.info("Revoked {} session(s) for tenant '{}'", tenantSessions.size(), tenantId);
            }
        } catch (Exception e) {
            log.warn("Could not revoke sessions for tenant '{}': {}", tenantId, e.getMessage());
        }

        try {
            String namespaceName = "tenant-" + tenantId.toString().substring(0, 8).toLowerCase();
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(deploymentServiceUrl + "/api/v1/k8s/namespaces/" + namespaceName))
                    .header("Authorization", authorizationHeader)
                    .timeout(Duration.ofSeconds(10))
                    .DELETE()
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                log.info("K8s namespace '{}' deleted for tenant '{}'", namespaceName, tenantId);
            } else {
                log.warn("Failed to delete K8s namespace '{}' for tenant '{}': HTTP {} - {}",
                        namespaceName, tenantId, response.statusCode(), response.body());
            }
        } catch (Exception e) {
            log.warn("Could not delete K8s namespace for tenant '{}': {}", tenantId, e.getMessage());
        }
    }

    private Tenant requireTenant(UUID tenantId) {
        return tenantRepository.findById(tenantId)
                .orElseThrow(() -> new NotFoundException("Tenant not found"));
    }

    private User requireCurrentUser(String authorizationHeader) {
        Session session = requireValidSession(authorizationHeader);
        return session.getUser();
    }

    private Session requireValidSession(String authorizationHeader) {
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

    private void requireSuperAdminOrTenantManage(User currentUser) {
        if (isSuperAdmin(currentUser)) {
            return;
        }

        UUID platformTenantId = userRoleRepository.findByRole_NameIgnoreCase(SUPER_ADMIN_ROLE)
                .stream()
                .findFirst()
                .map(userRole -> userRole.getUser().getTenant().getId())
                .orElse(null);

        if (platformTenantId == null || !platformTenantId.equals(currentUser.getTenant().getId())) {
            throw new ForbiddenException("Tenant management restricted to the platform tenant");
        }

        boolean canManage = userRoleRepository.findByUser_Id(currentUser.getId())
                .stream()
                .map(UserRole::getRole)
                .map(role -> rolePermissionRepository.findByRole_Id(role.getId()))
                .flatMap(List::stream)
                .map(RolePermission::getPermission)
                .anyMatch(permission -> permission.getName() != null
                        && permission.getName().trim().equalsIgnoreCase("TENANT_MANAGE"));

        if (!canManage) {
            throw new ForbiddenException("Tenant management permission required");
        }
    }

    private void ensureTenantAccess(User currentUser, Tenant tenant) {
        if (!isSuperAdmin(currentUser) && !tenant.getId().equals(currentUser.getTenant().getId())) {
            throw new ForbiddenException("Tenant belongs to another scope");
        }
    }

    private boolean isSuperAdmin(User currentUser) {
        return userRoleRepository.findByUser_Id(currentUser.getId())
                .stream()
                .map(UserRole::getRole)
                .anyMatch(role -> role.getName() != null && role.getName().trim().equalsIgnoreCase(SUPER_ADMIN_ROLE));
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

    private TenantStatus parseStatusOrDefault(String rawStatus, TenantStatus defaultValue) {
        if (rawStatus == null || rawStatus.isBlank()) {
            return defaultValue;
        }
        try {
            return TenantStatus.valueOf(rawStatus.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException exception) {
            throw new BadRequestException("Invalid tenant status");
        }
    }

    private String normalizeName(String value) {
        if (value == null || value.isBlank()) {
            throw new BadRequestException("Tenant name is required");
        }
        return value.trim();
    }

    private String normalizeNullable(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }

    private String generateUniqueTenantCode(String tenantName) {
        String base = tenantName
                .trim()
                .toUpperCase(Locale.ROOT)
                .replaceAll("[^A-Z0-9]", "")
                .replaceAll("(.)\\1{2,}", "$1$1");
        if (base.isEmpty()) {
            base = "TENANT";
        }
        if (base.length() > 6) {
            base = base.substring(0, 6);
        }

        String candidate = base;
        int suffix = 1;
        while (tenantRepository.findByCodeIgnoreCase(candidate).isPresent()) {
            candidate = base + String.format("%02d", suffix++);
        }
        return candidate;
    }

    private TenantResponse toResponse(Tenant tenant) {
        return new TenantResponse(
                tenant.getId(),
                tenant.getName(),
                tenant.getCode(),
                tenant.getContactEmail(),
                tenant.getPhone(),
                tenant.getModeDeployment(),
                tenant.getStatus().name(),
                userRepository.countByTenant_Id(tenant.getId()),
                tenant.getCreatedAt(),
                tenant.getUpdatedAt()
        );
    }

    private void writeAudit(User currentUser, String action, String details, String resourceId) {
        AuditLog auditLog = new AuditLog();
        auditLog.setUser(currentUser);
        auditLog.setTenant(currentUser.getTenant());
        auditLog.setAction(action);
        auditLog.setDetails(details);
        auditLog.setResource("tenant");
        auditLog.setResourceId(resourceId);
        auditLog.setIpAddress(resolveClientIp());
        auditLogRepository.save(auditLog);
    }

    private String resolveClientIp() {
        try {
            HttpServletRequest request = ((ServletRequestAttributes) RequestContextHolder.getRequestAttributes()).getRequest();
            String forwardedFor = request.getHeader("X-Forwarded-For");
            if (forwardedFor != null && !forwardedFor.isBlank()) {
                return forwardedFor.split(",")[0].trim();
            }
            String realIp = request.getHeader("X-Real-IP");
            if (realIp != null && !realIp.isBlank()) {
                return realIp;
            }
            return request.getRemoteAddr();
        } catch (Exception e) {
            return null;
        }
    }
}
