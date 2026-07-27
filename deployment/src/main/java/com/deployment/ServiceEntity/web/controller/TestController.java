package com.deployment.ServiceEntity.web.controller;

import java.time.Instant;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.deployment.ServiceEntity.web.dto.test.TestRequestDto;
import com.deployment.ServiceEntity.web.dto.test.TestResponseDto;
import com.deployment.ServiceEntity.web.routes.ApiRoutes;

@RestController
@RequestMapping(ApiRoutes.Test.BASE)
public class TestController {

  @GetMapping
  public ResponseEntity<TestResponseDto> healthCheck() {
    return ResponseEntity.ok(new TestResponseDto("API de test OK", Instant.now()));
  }

  @PostMapping
  public ResponseEntity<TestResponseDto> echo(@RequestBody TestRequestDto request) {
    String message = request != null && request.message() != null && !request.message().isBlank()
        ? request.message()
        : "Requête de test reçue";
    return ResponseEntity.ok(new TestResponseDto(message, Instant.now()));
  }
}
