package com.auth.service.service;

import java.time.Instant;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.auth.service.repository.SessionRepository;

@Service
public class SessionCleanupService {
    private static final Logger log = LoggerFactory.getLogger(SessionCleanupService.class);

    private final SessionRepository sessionRepository;

    public SessionCleanupService(SessionRepository sessionRepository) {
        this.sessionRepository = sessionRepository;
    }

    @Transactional
    @Scheduled(fixedDelay = 3600000, initialDelay = 120000)
    public void purgeExpiredSessions() {
        int purged = sessionRepository.deleteExpiredUnrevoked(Instant.now());
        if (purged > 0) {
            log.info("Purged {} expired sessions", purged);
        }
    }
}
