package com.auth.auth.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${app.mail.from:noreply@auth-service.local}")
    private String fromEmail;

    @Value("${app.frontend.base-url:http://localhost:5173}")
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
            "Ce lien expire dans 24 heures.\n\n" +
            "Si vous n'avez pas demandé cette action, veuillez ignorer cet email.\n\n" +
            "Cordialement,\nL'équipe d'authentification",
            userName, resetLink
        );

        sendEmail(toEmail, "Réinitialisation de votre mot de passe", body);
    }

    /**
     * Send 2FA setup email with secret key
     */
    public void send2FASetupEmail(String toEmail, String userName, String secretKey, String qrCodeUrl) {
        String body = String.format(
            "Bonjour %s,\n\n" +
            "Votre code d'authentification à deux facteurs (2FA) a été activé.\n\n" +
            "Votre clé secrète: %s\n\n" +
            "Utilisez votre application d'authentification (Google Authenticator, Authy, etc.) pour scanner le code QR.\n\n" +
            "Conservez cette clé secrète dans un endroit sûr.\n\n" +
            "Cordialement,\nL'équipe d'authentification",
            userName, secretKey
        );

        sendEmail(toEmail, "Authentification à deux facteurs activée", body);
    }

    /**
     * Send 2FA verification notification
     */
    public void send2FAVerificationNotification(String toEmail, String userName) {
        String body = String.format(
            "Bonjour %s,\n\n" +
            "Votre authentification à deux facteurs a été vérifiée avec succès.\n\n" +
            "Si ce n'était pas vous, veuillez immédiatement changer votre mot de passe.\n\n" +
            "Cordialement,\nL'équipe d'authentification",
            userName
        );

        sendEmail(toEmail, "Notification de vérification 2FA", body);
    }

    /**
     * Send 2FA disabled notification
     */
    public void send2FADisabledEmail(String toEmail, String userName) {
        String body = String.format(
            "Bonjour %s,\n\n" +
            "L'authentification à deux facteurs a été désactivée pour votre compte.\n\n" +
            "Si vous n'avez pas effectué cette action, veuillez immédiatement changer votre mot de passe et contacter le support.\n\n" +
            "Cordialement,\nL'équipe d'authentification",
            userName
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
            "Cordialement,\nL'équipe d'authentification",
            userName
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
            "Cordialement,\nL'équipe d'authentification",
            userName, ipAddress, java.time.Instant.now()
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
            "Cordialement,\nL'équipe d'authentification",
            userName
        );

        sendEmail(toEmail, "Compte suspendu", body);
    }

    /**
     * Generic email sending method
     */
    private void sendEmail(String toEmail, String subject, String body) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(toEmail);
            message.setSubject(subject);
            message.setText(body);
            
            mailSender.send(message);
        } catch (Exception e) {
            String message = e.getMessage() == null ? "unknown error" : e.getMessage();
            if (message.toLowerCase().contains("no password specified")) {
                System.err.println("Failed to send email to " + toEmail
                        + ": SMTP password is missing. Configure MAIL_PASSWORD or BREVO_SMTP_KEY.");
                return;
            }
            System.err.println("Failed to send email to " + toEmail + ": " + message);
        }
    }
}
