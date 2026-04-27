package com.auth.service.web.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.auth.service.service.SessionService;
import com.auth.service.web.dto.AuthActionResponse;
import com.auth.service.web.dto.SessionResponse;
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
    public ResponseEntity<List<SessionResponse>> listSessions(@RequestHeader("Authorization") String authorizationHeader) {
        return ResponseEntity.ok(sessionService.listSessions(authorizationHeader));
    }

    @DeleteMapping(ApiRoutes.Sessions.BY_ID)
    public ResponseEntity<AuthActionResponse> revokeSession(
            @RequestHeader("Authorization") String authorizationHeader,
            @PathVariable UUID sessionId
    ) {
        return ResponseEntity.ok(sessionService.revokeSession(authorizationHeader, sessionId));
    }
}
