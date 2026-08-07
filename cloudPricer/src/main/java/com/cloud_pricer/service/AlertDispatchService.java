package com.cloud_pricer.service;

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

    @Scheduled(fixedDelayString = "${alert.check.interval:60000}", initialDelay = 60000)
    public void dispatchOpenAlerts() {
        List<Alert> openAlerts = alertRepository.findByStatus("OPEN");
        if (openAlerts.isEmpty()) {
            return;
        }
        log.info("Dispatching {} open alerts", openAlerts.size());
        for (Alert alert : openAlerts) {
            try {
                dispatchAlert(alert);
            } catch (Exception e) {
                log.warn("Failed to dispatch alert {}: {}", alert.getId(), e.getMessage());
            }
        }
    }

    private void dispatchAlert(Alert alert) {
        String subject = String.format("[%s] %s Alert — %s",
                alert.getSeverity(), alert.getMetric(), alert.getType());
        String body = String.format(
                "Alert ID: %s\nSeverity: %s\nType: %s\nMetric: %s\nActual: %.2f\nThreshold: %.2f\nMessage: %s\nCreated: %s\n",
                alert.getId(), alert.getSeverity(), alert.getType(),
                alert.getMetric(), alert.getActualValue(), alert.getThreshold(),
                alert.getMessage(), alert.getCreatedAt());

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromEmail);
        message.setTo(recipientEmail);
        message.setSubject(subject);
        message.setText(body);
        try {
            mailSender.send(message);
            log.info("Alert {} dispatched via email", alert.getId());
        } catch (Exception e) {
            String msg = e.getMessage() != null ? e.getMessage() : "unknown error";
            String lower = msg.toLowerCase();
            if (lower.contains("no password specified") || lower.contains("authentication failed")) {
                log.warn("Email dispatch skipped for alert {}: SMTP not configured ({})", alert.getId(), msg);
            } else {
                log.error("Failed to email alert {}: {}", alert.getId(), msg);
            }
        }
    }
}
