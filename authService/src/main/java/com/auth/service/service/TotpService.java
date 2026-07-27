package com.auth.service.service;

import java.security.SecureRandom;
import java.util.Base64;

import org.springframework.stereotype.Service;

import dev.samstevens.totp.code.CodeGenerator;
import dev.samstevens.totp.code.DefaultCodeGenerator;
import dev.samstevens.totp.code.DefaultCodeVerifier;
import dev.samstevens.totp.code.HashingAlgorithm;
import dev.samstevens.totp.qr.QrData;
import dev.samstevens.totp.qr.QrGenerator;
import dev.samstevens.totp.qr.ZxingPngQrGenerator;
import dev.samstevens.totp.secret.DefaultSecretGenerator;
import dev.samstevens.totp.secret.SecretGenerator;
import dev.samstevens.totp.time.SystemTimeProvider;

@Service
public class TotpService {

    private static final int SECRET_SIZE = 32;

    public String generateSecret() {
        SecretGenerator generator = new DefaultSecretGenerator(SECRET_SIZE);
        return generator.generate();
    }

    public boolean verifyCode(String secret, String code) {
        try {
            DefaultCodeVerifier verifier = new DefaultCodeVerifier(new DefaultCodeGenerator(HashingAlgorithm.SHA1), new SystemTimeProvider());
            return verifier.isValidCode(secret, code);
        } catch (Exception e) {
            return false;
        }
    }

    public String generateQrCodeUri(String secret, String email, String issuer) {
        return new QrData.Builder()
                .label(email)
                .secret(secret)
                .issuer(issuer)
                .algorithm(HashingAlgorithm.SHA1)
                .digits(6)
                .period(30)
                .build()
                .getUri();
    }

    public String generateQrCodePngBase64(String secret, String email, String issuer) {
        try {
            QrData data = new QrData.Builder()
                    .label(email)
                    .secret(secret)
                    .issuer(issuer)
                    .algorithm(HashingAlgorithm.SHA1)
                    .digits(6)
                    .period(30)
                    .build();
            QrGenerator generator = new ZxingPngQrGenerator();
            byte[] png = generator.generate(data);
            return Base64.getEncoder().encodeToString(png);
        } catch (Exception e) {
            return null;
        }
    }
}