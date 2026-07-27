package com.auth.service.config;

import java.util.List;

import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

import com.auth.service.domain.Permission;
import com.auth.service.domain.Role;
import com.auth.service.domain.RolePermission;
import com.auth.service.domain.RolePermissionId;
import com.auth.service.domain.Tenant;
import com.auth.service.domain.TenantStatus;
import com.auth.service.domain.User;
import com.auth.service.domain.UserRole;
import com.auth.service.domain.UserRoleId;
import com.auth.service.domain.UserStatus;
import com.auth.service.repository.PermissionRepository;
import com.auth.service.repository.RolePermissionRepository;
import com.auth.service.repository.RoleRepository;
import com.auth.service.repository.TenantRepository;
import com.auth.service.repository.UserRepository;
import com.auth.service.repository.UserRoleRepository;

@Component
public class StartupDataSeeder implements CommandLineRunner {

    private static final String DEFAULT_TENANT_NAME = "default-tenant";
    private static final String DEFAULT_ADMIN_EMAIL = "admin@gmail.com";
    private static final String DEFAULT_SUPER_ADMIN_EMAIL = "superadmin@gmail.com";
    private static final String SUPER_ADMIN_ROLE_NAME = "super-admin";
    private static final String DEFAULT_PASSWORD = "test";

    private static final BCryptPasswordEncoder PASSWORD_ENCODER = new BCryptPasswordEncoder();

    private final TenantRepository tenantRepository;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final UserRoleRepository userRoleRepository;
    private final PermissionRepository permissionRepository;
    private final RolePermissionRepository rolePermissionRepository;

    public StartupDataSeeder(
            TenantRepository tenantRepository,
            UserRepository userRepository,
            RoleRepository roleRepository,
            UserRoleRepository userRoleRepository,
            PermissionRepository permissionRepository,
            RolePermissionRepository rolePermissionRepository) {
        this.tenantRepository = tenantRepository;
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.userRoleRepository = userRoleRepository;
        this.permissionRepository = permissionRepository;
        this.rolePermissionRepository = rolePermissionRepository;
    }

    @Override
    public void run(String... args) {
        Tenant defaultTenant = seedTenant(DEFAULT_TENANT_NAME, DEFAULT_ADMIN_EMAIL);
        Tenant salesTenant = seedTenant("sales-tenant", "sales.admin@gmail.com");
        Tenant financeTenant = seedTenant("finance-tenant", "finance.admin@gmail.com");

        Permission userRead = seedPermission("USER_READ", "Read users");
        Permission userManage = seedPermission("USER_MANAGE", "Manage users");
        Permission roleManage = seedPermission("ROLE_MANAGE", "Manage roles");
        Permission sessionManage = seedPermission("SESSION_MANAGE", "Manage sessions");
        Permission permissionManage = seedPermission("PERMISSION_MANAGE", "Manage permissions");
        Permission tenantManage = seedPermission("TENANT_MANAGE", "Manage tenants");
        Permission auditRead = seedPermission("AUDIT_READ", "Read audit logs");

        Permission deploymentRead = seedPermission("DEPLOYMENT_READ", "Read deployments");
        Permission deploymentManage = seedPermission("DEPLOYMENT_MANAGE", "Manage deployments");
        Permission vmRead = seedPermission("VM_READ", "Read virtual machines");
        Permission vmManage = seedPermission("VM_MANAGE", "Manage virtual machines");
        Permission backupRead = seedPermission("BACKUP_READ", "Read backups");
        Permission backupManage = seedPermission("BACKUP_MANAGE", "Manage backups");
        Permission k8sRead = seedPermission("K8S_READ", "Read Kubernetes resources");
        Permission k8sManage = seedPermission("K8S_MANAGE", "Manage Kubernetes resources");
        Permission notificationRead = seedPermission("NOTIFICATION_READ", "Read notifications");
        Permission notificationManage = seedPermission("NOTIFICATION_MANAGE", "Manage notifications");
        Permission costRead = seedPermission("COST_READ", "Read cost records");
        Permission costManage = seedPermission("COST_MANAGE", "Manage cost records");
        Permission quotaRead = seedPermission("QUOTA_READ", "Read quotas");
        Permission quotaManage = seedPermission("QUOTA_MANAGE", "Manage quotas");
        Permission alertRead = seedPermission("ALERT_READ", "Read alerts");
        Permission alertManage = seedPermission("ALERT_MANAGE", "Manage alerts");
        Permission metricRead = seedPermission("METRIC_READ", "Read metrics");
        Permission metricManage = seedPermission("METRIC_MANAGE", "Manage metrics");
        Permission priceConfigRead = seedPermission("PRICE_CONFIG_READ", "Read pricing configurations");
        Permission priceConfigManage = seedPermission("PRICE_CONFIG_MANAGE", "Manage pricing configurations");
        Permission forecastRead = seedPermission("FORECAST_READ", "Read cost forecasts");
        Permission sshManage = seedPermission("SSH_MANAGE", "Manage SSH access");

        Role defaultSuperAdminRole = seedRole(defaultTenant, SUPER_ADMIN_ROLE_NAME, "Platform super administrator");
        Role defaultAdminRole = seedRole(defaultTenant, "admin", "Default tenant administrator");
        Role defaultManagerRole = seedRole(defaultTenant, "manager", "Default tenant manager");
        Role defaultViewerRole = seedRole(defaultTenant, "viewer", "Default tenant viewer");
        Role defaultSupportRole = seedRole(defaultTenant, "support", "Default tenant support");

        Role salesAdminRole = seedRole(salesTenant, "admin", "Sales tenant administrator");
        Role salesManagerRole = seedRole(salesTenant, "manager", "Sales manager");
        Role salesAnalystRole = seedRole(salesTenant, "analyst", "Sales analyst");
        Role salesViewerRole = seedRole(salesTenant, "viewer", "Sales viewer");

        Role financeAdminRole = seedRole(financeTenant, "admin", "Finance tenant administrator");
        Role financeManagerRole = seedRole(financeTenant, "manager", "Finance manager");
        Role financeAnalystRole = seedRole(financeTenant, "analyst", "Finance analyst");
        Role financeViewerRole = seedRole(financeTenant, "viewer", "Finance viewer");

        List<Permission> allPermissions = List.of(
                userRead, userManage, roleManage, sessionManage, permissionManage, tenantManage, auditRead,
                deploymentRead, deploymentManage, vmRead, vmManage, backupRead, backupManage,
                k8sRead, k8sManage, notificationRead, notificationManage,
                costRead, costManage, quotaRead, quotaManage, alertRead, alertManage, metricRead, metricManage,
                priceConfigRead, priceConfigManage, forecastRead, sshManage);

        List<Permission> devopsPermissions = List.of(
                deploymentRead, deploymentManage, vmRead, vmManage, backupRead, backupManage,
                k8sRead, k8sManage, notificationRead, notificationManage, metricRead, sshManage);

        List<Permission> costPermissions = List.of(
                costRead, costManage, quotaRead, quotaManage, alertRead, alertManage,
                priceConfigRead, priceConfigManage, forecastRead);

        List<Permission> readOnlyDevops = List.of(
                deploymentRead, vmRead, backupRead, k8sRead, notificationRead, metricRead);

        seedRolePermissions(defaultSuperAdminRole, allPermissions);
        seedRolePermissions(defaultAdminRole, List.of(userRead, userManage, roleManage, sessionManage, auditRead, deploymentRead, deploymentManage, vmRead, vmManage, backupRead, backupManage, k8sRead, k8sManage, notificationRead, notificationManage, costRead, costManage, quotaRead, quotaManage, alertRead, alertManage, metricRead, metricManage, priceConfigRead, priceConfigManage, forecastRead, sshManage));
        seedRolePermissions(defaultManagerRole, List.of(userRead, userManage, sessionManage, deploymentRead, deploymentManage, vmRead, vmManage, backupRead, backupManage, k8sRead, notificationRead, metricRead, sshManage));
        seedRolePermissions(defaultViewerRole, List.of(userRead, deploymentRead, vmRead, backupRead, k8sRead, notificationRead, metricRead));
        seedRolePermissions(defaultSupportRole, List.of(userRead, sessionManage, deploymentRead, vmRead, k8sRead, notificationRead, metricRead));

        seedRolePermissions(salesAdminRole, List.of(userRead, userManage, roleManage, sessionManage, auditRead));
        seedRolePermissions(salesManagerRole, List.of(userRead, userManage, sessionManage));
        seedRolePermissions(salesAnalystRole, List.of(userRead, auditRead));
        seedRolePermissions(salesViewerRole, List.of(userRead));

        seedRolePermissions(financeAdminRole, List.of(userRead, userManage, roleManage, sessionManage, permissionManage, auditRead, costRead, costManage, quotaRead, quotaManage, alertRead, alertManage));
        seedRolePermissions(financeManagerRole, List.of(userRead, userManage, auditRead, costRead, quotaRead, alertRead));
        seedRolePermissions(financeAnalystRole, List.of(userRead, auditRead, costRead, quotaRead, alertRead));
        seedRolePermissions(financeViewerRole, List.of(userRead));

        User superAdmin = seedUser(defaultTenant, DEFAULT_SUPER_ADMIN_EMAIL, DEFAULT_PASSWORD, UserStatus.ACTIVE);
        User defaultAdmin = seedUser(defaultTenant, DEFAULT_ADMIN_EMAIL, DEFAULT_PASSWORD, UserStatus.ACTIVE);
        User defaultManager = seedUser(defaultTenant, "manager@gmail.com", DEFAULT_PASSWORD, UserStatus.ACTIVE);
        User defaultViewer = seedUser(defaultTenant, "viewer@gmail.com", DEFAULT_PASSWORD, UserStatus.ACTIVE);
        User defaultSupport = seedUser(defaultTenant, "support@gmail.com", DEFAULT_PASSWORD, UserStatus.ACTIVE);
        User testUser = seedUser(defaultTenant, "mehdibelhajali9@gmail.com", DEFAULT_PASSWORD, UserStatus.ACTIVE);
        User testUser2 = seedUser(defaultTenant, "mehdibenhadjali9@gmail.com", DEFAULT_PASSWORD, UserStatus.ACTIVE);

        User salesAdmin = seedUser(salesTenant, "sales.admin@gmail.com", DEFAULT_PASSWORD, UserStatus.ACTIVE);
        User salesManager = seedUser(salesTenant, "sales.manager@gmail.com", DEFAULT_PASSWORD, UserStatus.ACTIVE);
        User salesAnalyst = seedUser(salesTenant, "sales.analyst@gmail.com", DEFAULT_PASSWORD, UserStatus.ACTIVE);
        User salesViewer = seedUser(salesTenant, "sales.viewer@gmail.com", DEFAULT_PASSWORD, UserStatus.ACTIVE);

        User financeAdmin = seedUser(financeTenant, "finance.admin@gmail.com", DEFAULT_PASSWORD, UserStatus.ACTIVE);
        User financeManager = seedUser(financeTenant, "finance.manager@gmail.com", DEFAULT_PASSWORD, UserStatus.ACTIVE);
        User financeAnalyst = seedUser(financeTenant, "finance.analyst@gmail.com", DEFAULT_PASSWORD, UserStatus.ACTIVE);
        User financeViewer = seedUser(financeTenant, "finance.viewer@gmail.com", DEFAULT_PASSWORD, UserStatus.ACTIVE);

        seedUserRole(superAdmin, defaultSuperAdminRole);
        seedUserRole(defaultAdmin, defaultAdminRole);
        seedUserRole(defaultManager, defaultManagerRole);
        seedUserRole(defaultViewer, defaultViewerRole);
        seedUserRole(defaultSupport, defaultSupportRole);
        seedUserRole(testUser, defaultViewerRole);
        seedUserRole(testUser2, defaultViewerRole);

        seedUserRole(salesAdmin, salesAdminRole);
        seedUserRole(salesManager, salesManagerRole);
        seedUserRole(salesAnalyst, salesAnalystRole);
        seedUserRole(salesViewer, salesViewerRole);

        seedUserRole(financeAdmin, financeAdminRole);
        seedUserRole(financeManager, financeManagerRole);
        seedUserRole(financeAnalyst, financeAnalystRole);
        seedUserRole(financeViewer, financeViewerRole);
    }

    private Tenant seedTenant(String name, String contactEmail) {
        return tenantRepository.findByName(name)
                .map(existing -> {
                    existing.setContactEmail(contactEmail);
                    existing.setModeDeployment("VM");
                    existing.setStatus(TenantStatus.ACTIVE);
                    return tenantRepository.save(existing);
                })
                .orElseGet(() -> {
                    Tenant createdTenant = new Tenant();
                    createdTenant.setName(name);
                    createdTenant.setContactEmail(contactEmail);
                    createdTenant.setModeDeployment("VM");
                    createdTenant.setStatus(TenantStatus.ACTIVE);
                    return tenantRepository.save(createdTenant);
                });
    }

    private Permission seedPermission(String name, String description) {
        return permissionRepository.findByName(name)
                .map(existing -> {
                    existing.setDescription(description);
                    return permissionRepository.save(existing);
                })
                .orElseGet(() -> {
                    Permission permission = new Permission();
                    permission.setName(name);
                    permission.setDescription(description);
                    return permissionRepository.save(permission);
                });
    }

    private Role seedRole(Tenant tenant, String name, String description) {
        return roleRepository.findByTenant_IdAndName(tenant.getId(), name)
                .map(existing -> {
                    existing.setDescription(description);
                    return roleRepository.save(existing);
                })
                .orElseGet(() -> {
                    Role role = new Role();
                    role.setTenant(tenant);
                    role.setName(name);
                    role.setDescription(description);
                    return roleRepository.save(role);
                });
    }

    private User seedUser(Tenant tenant, String email, String rawPassword, UserStatus status) {
        return userRepository.findByTenant_IdAndEmail(tenant.getId(), email)
                .map(existing -> {
                    existing.setPassword(PASSWORD_ENCODER.encode(rawPassword));
                    existing.setStatus(status);
                    return userRepository.save(existing);
                })
                .orElseGet(() -> {
                    User user = new User();
                    user.setTenant(tenant);
                    user.setEmail(email);
                    user.setPassword(PASSWORD_ENCODER.encode(rawPassword));
                    user.setStatus(status);
                    return userRepository.save(user);
                });
    }

    private void seedUserRole(User user, Role role) {
        UserRoleId userRoleId = new UserRoleId(user.getId(), role.getId());
        if (userRoleRepository.existsById(userRoleId)) {
            return;
        }

        UserRole userRole = new UserRole();
        userRole.setId(userRoleId);
        userRole.setUser(user);
        userRole.setRole(role);
        userRoleRepository.save(userRole);
    }

    private void seedRolePermissions(Role role, List<Permission> permissions) {
        for (Permission permission : permissions) {
            RolePermissionId rolePermissionId = new RolePermissionId(role.getId(), permission.getId());
            if (rolePermissionRepository.existsById(rolePermissionId)) {
                continue;
            }

            RolePermission rolePermission = new RolePermission();
            rolePermission.setId(rolePermissionId);
            rolePermission.setRole(role);
            rolePermission.setPermission(permission);
            rolePermissionRepository.save(rolePermission);
        }
    }
}
