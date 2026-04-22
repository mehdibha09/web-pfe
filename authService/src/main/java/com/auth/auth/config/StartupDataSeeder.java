package com.auth.auth.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import com.auth.auth.domain.Tenant;
import com.auth.auth.domain.TenantStatus;
import com.auth.auth.domain.User;
import com.auth.auth.domain.UserStatus;
import com.auth.auth.repository.TenantRepository;
import com.auth.auth.repository.UserRepository;

@Component
public class StartupDataSeeder implements CommandLineRunner {

    private static final String DEFAULT_TENANT_NAME = "default-tenant";
    private static final String DEFAULT_ADMIN_EMAIL = "admin@gmail.com";
    private static final String DEFAULT_ADMIN_PASSWORD = "test";

    private final TenantRepository tenantRepository;
    private final UserRepository userRepository;

    public StartupDataSeeder(TenantRepository tenantRepository, UserRepository userRepository) {
        this.tenantRepository = tenantRepository;
        this.userRepository = userRepository;
    }

    @Override
    public void run(String... args) {
        Tenant tenant = tenantRepository.findByName(DEFAULT_TENANT_NAME)
                .orElseGet(() -> {
                    Tenant createdTenant = new Tenant();
                    createdTenant.setName(DEFAULT_TENANT_NAME);
                    createdTenant.setContactEmail(DEFAULT_ADMIN_EMAIL);
                    createdTenant.setModeDeployment("VM");
                    createdTenant.setStatus(TenantStatus.ACTIVE);
                    return tenantRepository.save(createdTenant);
                });

        userRepository.findByTenant_IdAndEmail(tenant.getId(), DEFAULT_ADMIN_EMAIL)
                .orElseGet(() -> {
                    User admin = new User();
                    admin.setTenant(tenant);
                    admin.setEmail(DEFAULT_ADMIN_EMAIL);
                    admin.setPassword(DEFAULT_ADMIN_PASSWORD);
                    admin.setStatus(UserStatus.ACTIVE);
                    return userRepository.save(admin);
                });
    }
}
