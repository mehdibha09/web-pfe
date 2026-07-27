package com.deployment.ServiceEntity.web.controller;

import java.io.IOException;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CopyOnWriteArrayList;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import com.deployment.ServiceEntity.config.UserContext;
import com.deployment.ServiceEntity.service.NotificationService;
import com.deployment.ServiceEntity.web.dto.notification.NotificationCreateDto;
import com.deployment.ServiceEntity.web.dto.notification.NotificationResponseDto;
import com.deployment.ServiceEntity.web.routes.ApiRoutes;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping(ApiRoutes.Notification.BASE)
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    private final List<SseEmitter> emitters = new CopyOnWriteArrayList<>();

    @PostMapping
    public ResponseEntity<NotificationResponseDto> create(@Valid @RequestBody NotificationCreateDto dto) {
        UserContext.requirePermission("NOTIFICATION_MANAGE");
        NotificationResponseDto created = notificationService.create(dto);
        pushToAll(created);
        return ResponseEntity.ok(created);
    }

    @GetMapping
    public ResponseEntity<Page<NotificationResponseDto>> getByUserId(
            @PageableDefault(size = 10) Pageable pageable) {
        UserContext.requirePermission("NOTIFICATION_READ");
        List<NotificationResponseDto> all = notificationService.getByUserId(UserContext.getUserId());
        int start = (int) pageable.getOffset();
        int end = Math.min(start + pageable.getPageSize(), all.size());
        List<NotificationResponseDto> content = start < all.size() ? all.subList(start, end) : List.of();
        return ResponseEntity.ok(new PageImpl<>(content, pageable, all.size()));
    }

    @GetMapping("/unread")
    public ResponseEntity<List<NotificationResponseDto>> getUnread() {
        UserContext.requirePermission("NOTIFICATION_READ");
        return ResponseEntity.ok(notificationService.getUnreadByUserId(UserContext.getUserId()));
    }

    @GetMapping("/unread/count")
    public ResponseEntity<Map<String, Long>> countUnread() {
        UserContext.requirePermission("NOTIFICATION_READ");
        return ResponseEntity.ok(Map.of("count", notificationService.countUnread(UserContext.getUserId())));
    }

    @PatchMapping("/{id}/read")
    public ResponseEntity<NotificationResponseDto> markAsRead(@PathVariable UUID id) {
        UserContext.requirePermission("NOTIFICATION_MANAGE");
        return ResponseEntity.ok(notificationService.markAsRead(id));
    }

    @PatchMapping("/read-all")
    public ResponseEntity<Void> markAllAsRead() {
        UserContext.requirePermission("NOTIFICATION_MANAGE");
        notificationService.markAllAsRead(UserContext.getUserId());
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        UserContext.requirePermission("NOTIFICATION_MANAGE");
        notificationService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/user/{userId}")
    public ResponseEntity<Void> deleteByUserId(@PathVariable UUID userId) {
        UserContext.requirePermission("NOTIFICATION_MANAGE");
        UUID currentUserId = UserContext.getUserId();
        if (!userId.equals(currentUserId)) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.FORBIDDEN).build();
        }
        notificationService.deleteByUserId(userId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter subscribe() {
        SseEmitter emitter = new SseEmitter(-1L);
        emitter.onCompletion(() -> emitters.remove(emitter));
        emitter.onTimeout(() -> emitters.remove(emitter));
        emitter.onError(e -> emitters.remove(emitter));
        emitters.add(emitter);
        return emitter;
    }

    private void pushToAll(NotificationResponseDto notification) {
        List<SseEmitter> dead = new java.util.ArrayList<>();
        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event()
                        .name("notification")
                        .data(Map.of(
                                "id", notification.id(),
                                "title", notification.title(),
                                "message", notification.message(),
                                "type", notification.type(),
                                "read", notification.read(),
                                "link", notification.link() != null ? notification.link() : "",
                                "timestamp", Instant.now().toString())));
            } catch (IOException e) {
                dead.add(emitter);
            }
        }
        emitters.removeAll(dead);
    }
}
