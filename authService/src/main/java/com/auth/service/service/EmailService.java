package com.auth.service.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final JavaMailSender mailSender;

    @Value("${app.mail.from:noreply@auth-service.local}")
    private String fromEmail;

    @Value("${app.frontend.base-url}")
    private String frontendBaseUrl;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    /**
     * Send password reset email
     */
    public void sendPasswordResetEmail(String toEmail, String resetToken, String userName) {
        String resetLink = frontendBaseUrl.replaceAll("/+$", "") + "/resetPassword/" + resetToken;

        String body = String.format(
            "Bonjour %s,\n\n" +
            "Vous avez demandé de réinitialiser votre mot de passe.\n\n" +
            "Cliquez sur le lien ci-dessous pour réinitialiser votre mot de passe:\n" +
            "%s\n\n" +
            "Ce lien expire dans 1 heure.\n\n" +
            "Si vous n'avez pas demandé cette action, veuillez ignorer cet email.\n\n" +
            "%s",
            userName, resetLink, signature()
        );

        sendEmail(toEmail, "Réinitialisation de votre mot de passe", body);
    }

    /**
     * Send 2FA verification notification
     */
    public void send2FAVerificationNotification(String toEmail, String userName) {
        String body = String.format(
            "Bonjour %s,\n\n" +
            "Votre authentification à deux facteurs a été vérifiée avec succès.\n\n" +
            "Si ce n'était pas vous, veuillez immédiatement changer votre mot de passe.\n\n" +
            "%s",
            userName, signature()
        );

        sendEmail(toEmail, "Notification de vérification 2FA", body);
    }

    /**
     * Send email verification code for login 2FA
     */
    public void sendLoginTwoFaCodeEmail(String toEmail, String userName, String code, int expiresMinutes) {
        String body = String.format(
            "Bonjour %s,\n\n" +
            "Votre code de vérification pour la connexion est : %s\n\n" +
            "Ce code expire dans %d minutes.\n\n" +
            "Si ce n'était pas vous, ignorez cet email.\n\n" +
            "%s",
            userName, code, expiresMinutes, signature()
        );

        sendEmail(toEmail, "Code de vérification de connexion", body);
    }

    /**
     * Send 2FA setup verification code email
     */
    public void sendTwoFaSetupCodeEmail(String toEmail, String userName, String code, int expiresMinutes) {
        String body = String.format(
            "Bonjour %s,\n\n" +
            "Votre code d'activation 2FA est : %s\n\n" +
            "Ce code expire dans %d minutes.\n\n" +
            "%s",
            userName, code, expiresMinutes, signature()
        );

        sendEmail(toEmail, "Code d'activation 2FA", body);
    }

    /**
     * Send 2FA disabled notification
     */
    public void send2FADisabledEmail(String toEmail, String userName) {
        String body = String.format(
            "Bonjour %s,\n\n" +
            "L'authentification à deux facteurs a été désactivée pour votre compte.\n\n" +
            "Si vous n'avez pas effectué cette action, veuillez immédiatement changer votre mot de passe et contacter le support.\n\n" +
            "%s",
            userName, signature()
        );

        sendEmail(toEmail, "Authentification à deux facteurs désactivée", body);
    }

    /**
     * Send password change confirmation email
     */
    public void sendPasswordChangeEmail(String toEmail, String userName) {
        String body = String.format(
            "Bonjour %s,\n\n" +
            "Votre mot de passe a été modifié avec succès.\n\n" +
            "Si vous n'avez pas effectué cette action, veuillez immédiatement contacter le support.\n\n" +
            "%s",
            userName, signature()
        );

        sendEmail(toEmail, "Confirmation de changement de mot de passe", body);
    }

    /**
     * Send login notification email
     */
    public void sendLoginNotificationEmail(String toEmail, String userName, String ipAddress) {
        String body = String.format(
            "Bonjour %s,\n\n" +
            "Une connexion à votre compte a été détectée.\n\n" +
            "Adresse IP: %s\n" +
            "Horodatage: %s\n\n" +
            "Si ce n'était pas vous, veuillez immédiatement changer votre mot de passe.\n\n" +
            "%s",
            userName, ipAddress, java.time.Instant.now(), signature()
        );

        sendEmail(toEmail, "Notification de connexion", body);
    }

    /**
     * Send account suspended notification
     */
    public void sendAccountSuspendedEmail(String toEmail, String userName) {
        String body = String.format(
            "Bonjour %s,\n\n" +
            "Votre compte a été suspendu.\n\n" +
            "Veuillez contacter le support pour plus d'informations.\n\n" +
            "%s",
            userName, signature()
        );

        sendEmail(toEmail, "Compte suspendu", body);
    }

    /**
     * Build the closing signature block appended to every email.
     * Includes a human-readable site name and the site URL.
     */
    private String signature() {
        return "Cordialement,\n" + siteName() + "\n" + frontendBaseUrl;
    }

    /**
     * Derive a readable site name from the configured frontend base URL.
     */
    private String siteName() {
        String host = frontendBaseUrl
                .replaceAll("^[a-zA-Z]+://", "")
                .replaceAll("/.*$", "")
                .replaceAll(":.*$", "");
        if (host == null || host.isBlank() || host.contains("localhost") || host.equals("127.0.0.1")) {
            return "PFE Cloud Platform";
        }
        return host;
    }

    /**
     * Generic email sending method (best-effort: failures are logged, never thrown)
     */
    private void sendEmail(String toEmail, String subject, String body) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(toEmail);
            message.setSubject(subject);
            message.setText(body);

            mailSender.send(message);
            log.info("Email sent successfully to {} (subject='{}', from='{}')", toEmail, subject, fromEmail);
        } catch (Exception e) {
            String message = e.getMessage() == null ? "unknown error" : e.getMessage();
            String lowerMessage = message.toLowerCase();
            if (lowerMessage.contains("no password specified")) {
                log.error("Failed to send email to {}: SMTP password is missing. Configure MAIL_PASSWORD or BREVO_SMTP_KEY.", toEmail, e);
                return;
            }
            if (lowerMessage.contains("authentication failed")) {
                log.error("Failed to send email to {}: SMTP authentication failed. Check BREVO_SMTP_KEY/MAIL_PASSWORD and SMTP username (MAIL_USERNAME or BREVO_SMTP_USER). For Brevo, use your SMTP login or apikey depending on account settings.", toEmail, e);
                return;
            }
            log.error("Failed to send email to {} (subject='{}', from='{}'): {}", toEmail, subject, fromEmail, message, e);
        }
    }
}
