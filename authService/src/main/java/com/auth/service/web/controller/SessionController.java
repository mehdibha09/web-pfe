package com.auth.service.web.controller;

import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.auth.service.service.SessionService;
import com.auth.service.web.dto.auth.AuthActionResponse;
import com.auth.service.web.dto.session.SessionResponse;
import com.auth.service.web.routes.ApiRoutes;

@RestController
@RequestMapping(ApiRoutes.Sessions.BASE)
@Validated
public class SessionController {

    private final SessionService sessionService;

    public SessionController(SessionService sessionService) {
        this.sessionService = sessionService;
    }

    @GetMapping
    public ResponseEntity<Page<SessionResponse>> listSessions(
            @RequestHeader("Authorization") String authorizationHeader,
            @PageableDefault(size = 10) Pageable pageable
    ) {
        Page<SessionResponse> page = sessionService.listSessions(authorizationHeader, pageable);
        return ResponseEntity.ok(page);
    }

    @DeleteMapping(ApiRoutes.Sessions.BY_ID)
    public ResponseEntity<AuthActionResponse> revokeSession(
            @RequestHeader("Authorization") String authorizationHeader,
            @PathVariable UUID sessionId
    ) {
        return ResponseEntity.ok(sessionService.revokeSession(authorizationHeader, sessionId));
    }
}
