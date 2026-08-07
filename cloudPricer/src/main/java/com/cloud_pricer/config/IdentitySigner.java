package com.cloud_pricer.config;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.stereotype.Component;

/**
 * Verifies that identity headers (X-User-Id, X-Tenant-Id, X-User-Roles,
 * X-User-Permissions) were signed by the trusted gateway. Any request without
 * a valid signature is treated as unauthenticated so a client cannot forge
 * identity (e.g. a super-admin) by calling this service directly.
 */
@Component
public class IdentitySigner {

    public static final String ID_HEADER_USER_ID = "X-User-Id";
    public static final String ID_HEADER_TENANT_ID = "X-Tenant-Id";
    public static final String ID_HEADER_ROLES = "X-User-Roles";
    public static final String ID_HEADER_PERMISSIONS = "X-User-Permissions";
    public static final String SIGNATURE_HEADER = "X-Identity-Signature";

    private final byte[] secret;

    public IdentitySigner(org.springframework.core.env.Environment env) {
        String configured = env.getProperty("security.internal-signing-secret",
                "change-me-please-define-security.internal-signing-secret");
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