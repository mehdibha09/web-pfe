package com.deployment.ServiceEntity.service;

import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import com.deployment.ServiceEntity.config.UserContext;
import com.deployment.ServiceEntity.domain.Notification;
import com.deployment.ServiceEntity.repository.NotificationRepository;
import com.deployment.ServiceEntity.web.dto.notification.NotificationCreateDto;
import com.deployment.ServiceEntity.web.dto.notification.NotificationResponseDto;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;

    public NotificationResponseDto create(NotificationCreateDto dto) {
        Notification n = new Notification();
        n.setUserId(UserContext.getUserId());
        n.setTitle(dto.title());
        n.setMessage(dto.message());
        n.setType(Notification.Type.valueOf(dto.type()));
        n.setRead(false);
        n.setTenantId(UserContext.getTenantId());
        n.setLink(dto.link());
        n.setAlertId(dto.alertId());
        return map(notificationRepository.save(n));
    }

    public List<NotificationResponseDto> getByUserId(UUID userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream().map(this::map).toList();
    }

    public Page<NotificationResponseDto> getPageByUserId(UUID userId, Pageable pageable) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable)
                .map(this::map);
    }

    public List<NotificationResponseDto> getUnreadByUserId(UUID userId) {
        return notificationRepository.findByUserIdAndReadFalseOrderByCreatedAtDesc(userId)
                .stream().map(this::map).toList();
    }

    public long countUnread(UUID userId) {
        return notificationRepository.countByUserIdAndReadFalse(userId);
    }

    public NotificationResponseDto markAsRead(UUID id) {
        Notification n = notificationRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Notification not found"));
        // Scoping : le marquage lu n'est autorisé que sur les notifications de
        // l'utilisateur courant (et de son tenant).
        if (!n.getUserId().equals(UserContext.getUserId())
                || !n.getTenantId().equals(UserContext.getTenantId())) {
            throw new EntityNotFoundException("Notification not found");
        }
        n.setRead(true);
        return map(notificationRepository.save(n));
    }

    public void markAllAsRead(UUID userId) {
        List<Notification> unread = notificationRepository.findByUserIdAndReadFalseOrderByCreatedAtDesc(userId);
        for (Notification n : unread) {
            n.setRead(true);
        }
        notificationRepository.saveAll(unread);
    }

    public void delete(UUID id) {
        Notification n = notificationRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Notification not found"));
        // Scoping tenant : suppression réservée au propriétaire de la notification.
        if (!n.getTenantId().equals(UserContext.getTenantId())
                || !n.getUserId().equals(UserContext.getUserId())) {
            throw new EntityNotFoundException("Notification not found");
        }
        notificationRepository.delete(n);
    }

    public void deleteByUserId(UUID userId) {
        notificationRepository.deleteByUserId(userId);
    }

    private NotificationResponseDto map(Notification n) {
        return new NotificationResponseDto(
                n.getId(),
                n.getUserId(),
                n.getTitle(),
                n.getMessage(),
                n.getType().name(),
                n.isRead(),
                n.getTenantId(),
                n.getLink(),
                n.getAlertId(),
                n.getCreatedAt(),
                n.getUpdatedAt()
        );
    }
}
