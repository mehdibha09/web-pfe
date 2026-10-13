package com.cloud_pricer.service;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import com.cloud_pricer.domain.Alert;
import com.cloud_pricer.repository.AlertRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@ConditionalOnProperty(name = "alert.dispatch.enabled", havingValue = "true", matchIfMissing = true)
@ConditionalOnClass(name = "org.springframework.mail.javamail.JavaMailSender")
@RequiredArgsConstructor
public class AlertDispatchService {

    private final AlertRepository alertRepository;
    private final JavaMailSender mailSender;

    @Value("${app.mail.from:noreply@cloud-pricer.local}")
    private String fromEmail;

    @Value("${app.alert.recipient:admin@example.com}")
    private String recipientEmail;

    @Value("${frontend.base-url:http://192.168.56.10:30080}")
    private String frontendBaseUrl;

    @Value("${app.alert.support-email:}")
    private String supportEmail;

    @Value("${alert.dispatch.min-severity:WARNING}")
    private String minSeverity;

    @Value("${alert.dispatch.cooldown-ms:3600000}")
    private long cooldownMs;

    private static final List<String> SEVERITY_ORDER =
            List.of("INFO", "WARNING", "CRITICAL");

    /**
     * Politique de notification par email :
     *  - Chaque alerte n'est envoyée qu'une seule fois (notified_at IS NULL).
     *  - Seules les alertes de sévérité >= alert.dispatch.min-severity sont
     *    envoyées par email (les INFO sont enregistrées mais silencieuses).
     *  - Anti-récurrence (cooldown) : si une alerte de la même clé
     *    (service-env + metrique + sévérité) a déjà été notifiée dans la fenêtre
     *    configurée, une nouvelle occurrence est marquée notifiée mais n'est pas
     *    re-sendée — évite les flots d'emails quand une alerte est resolue puis
     *    recreée en boucle.
     */
    @Scheduled(fixedDelayString = "${alert.check.interval:60000}", initialDelay = 60000)
    public void dispatchOpenAlerts() {
        List<Alert> pending = alertRepository.findByStatusAndNotifiedAtIsNull("OPEN");
        if (pending.isEmpty()) {
            return;
        }
        int notified = 0;
        int skippedBelowSeverity = 0;
        int skippedCooldown = 0;
        for (Alert alert : pending) {
            try {
                if (!meetsMinSeverity(alert)) {
                    markNotified(alert, false);
                    skippedBelowSeverity++;
                    continue;
                }
                if (isWithinCooldown(alert)) {
                    markNotified(alert, false);
                    skippedCooldown++;
                    continue;
                }
                sendMail(alert);
                markNotified(alert, true);
                notified++;
            } catch (Exception e) {
                log.warn("Failed to dispatch alert {}: {}", alert.getId(), e.getMessage());
            }
        }
        log.info("Alert dispatch: {} notified, {} below min-severity, {} in cooldown (total {})",
                notified, skippedBelowSeverity, skippedCooldown, pending.size());
    }

    private boolean meetsMinSeverity(Alert alert) {
        return severityRank(alert.getSeverity()) >= severityRank(minSeverity);
    }

    private int severityRank(String severity) {
        String s = severity == null ? "" : severity.toUpperCase();
        int rank = SEVERITY_ORDER.indexOf(s);
        return rank < 0 ? 0 : rank;
    }

    private boolean isWithinCooldown(Alert alert) {
        if (cooldownMs <= 0) {
            return false;
        }
        Alert last = alertRepository
                .findFirstByServiceEnvironmentIdAndMetricAndSeverityAndNotifiedAtNotNullOrderByNotifiedAtDesc(
                        alert.getServiceEnvironmentId(), alert.getMetric(), alert.getSeverity());
        if (last == null || last.equals(alert) || last.getNotifiedAt() == null) {
            return false;
        }
        long elapsed = Duration.between(last.getNotifiedAt(), Instant.now()).toMillis();
        return elapsed < cooldownMs;
    }

    private void markNotified(Alert alert, boolean viaEmail) {
        alert.setNotifiedAt(Instant.now());
        alertRepository.save(alert);
        log.info("Alert {} marked as notified{}", alert.getId(),
                viaEmail ? " (email sent)" : " (email skipped)");
    }

    private void sendMail(Alert alert) {
        String subject = String.format("[%s] %s Alert — %s",
                alert.getSeverity(), alert.getMetric(), alert.getType());
        String body = buildBody(alert);

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromEmail);
        message.setTo(recipientEmail);
        message.setSubject(subject);
        message.setText(body);
        mailSender.send(message);
    }

    private String buildBody(Alert alert) {
        String support = (supportEmail != null && !supportEmail.isBlank())
                ? supportEmail
                : recipientEmail;
        String site = frontendBaseUrl != null && !frontendBaseUrl.isBlank()
                ? frontendBaseUrl
                : "http://192.168.56.10:30080";
        return String.format(
                "Bonjour,\n\n"
                + "Une alerte a été détectée sur votre plateforme de gestion cloud :\n\n"
                + "==============================\n"
                + "Alert ID    : %s\n"
                + "Sévérité    : %s\n"
                + "Type        : %s\n"
                + "Métrique    : %s\n"
                + "Seuil       : %s\n"
                + "Valeur      : %s\n"
                + "Détails     : %s\n"
                + "Créée le    : %s\n"
                + "==============================\n\n"
                + "Si le budget est dépassé, connectez-vous au portail pour analyser "
                + "la consommation et ajuster vos ressources ou votre budget :\n\n"
                + "    Site web : %s\n\n"
                + "Vous y retrouverez vos quotas, coûts et tableaux de bord. "
                + "Pour toute question, contactez le support à : %s\n\n"
                + "Ceci est un message automatique. Merci de ne pas y répondre.\n",
                alert.getId(), alert.getSeverity(), alert.getType(), alert.getMetric(),
                formatValue(alert.getThreshold()), formatValue(alert.getActualValue()),
                safeMessage(alert.getMessage()), alert.getCreatedAt(),
                site, support);
    }

    private String formatValue(double value) {
        return String.format("%.2f", value);
    }

    private String safeMessage(String message) {
        return message != null && !message.isBlank() ? message : "—";
    }
}
