package com.deployment.ServiceEntity.config;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * Verifies that identity headers (X-User-Id, X-Tenant-Id, X-User-Roles,
 * X-User-Permissions) were signed by the trusted gateway. Any request without
 * a valid signature is treated as unauthenticated so a client cannot forge
 * identity (e.g. a super-admin) by calling this service directly.
 */
@Component
public class IdentitySigner {

    private static final Logger log = LoggerFactory.getLogger(IdentitySigner.class);

    public static final String ID_HEADER_USER_ID = "X-User-Id";
    public static final String ID_HEADER_TENANT_ID = "X-Tenant-Id";
    public static final String ID_HEADER_ROLES = "X-User-Roles";
    public static final String ID_HEADER_PERMISSIONS = "X-User-Permissions";
    public static final String SIGNATURE_HEADER = "X-Identity-Signature";

    private static final String DEFAULT_SECRET =
            "change-me-please-define-security.internal-signing-secret";

    private final byte[] secret;

    public IdentitySigner(org.springframework.core.env.Environment env) {
        String configured = env.getProperty("security.internal-signing-secret", DEFAULT_SECRET);
        if (configured.isBlank()) {
            throw new IllegalStateException(
                    "security.internal-signing-secret must be configured");
        }
        if (DEFAULT_SECRET.equals(configured)) {
            boolean prod = java.util.Arrays.asList(env.getActiveProfiles()).contains("prod");
            if (prod) {
                throw new IllegalStateException(
                        "security.internal-signing-secret is still the insecure default in prod; set a real secret");
            }
            log.warn("security.internal-signing-secret is using the insecure default value; "
                    + "set a real secret before running in production");
        }
        this.secret = configured.getBytes(StandardCharsets.UTF_8);
    }

    public boolean verify(String signature, String userId, String tenantId, String rolesJson, String permissionsJson) {
        if (signature == null || signature.isBlank()) {
            return false;
        }
        String expected = sign(userId, tenantId, rolesJson, permissionsJson);
        return MessageDigest.isEqual(expected.getBytes(StandardCharsets.UTF_8), signature.getBytes(StandardCharsets.UTF_8));
    }

    public String sign(String userId, String tenantId, String rolesJson, String permissionsJson) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret, "HmacSHA256"));
            return bytesToHex(mac.doFinal(canonical(userId, tenantId, rolesJson, permissionsJson).getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException("Unable to sign identity headers", e);
        }
    }

    private static String canonical(String userId, String tenantId, String rolesJson, String permissionsJson) {
        return (userId == null ? "" : userId) + "|" + (tenantId == null ? "" : tenantId) + "|"
                + (rolesJson == null ? "" : rolesJson) + "|"
                + (permissionsJson == null ? "" : permissionsJson);
    }

    private static String bytesToHex(byte[] data) {
        StringBuilder sb = new StringBuilder(data.length * 2);
        for (byte b : data) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }
}