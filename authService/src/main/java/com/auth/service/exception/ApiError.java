package com.auth.service.exception;



import java.time.Instant;
import java.util.List;

public record ApiError(
        Instant timestamp,
        int status,
        String error,
        String message,
        String path,
        String code,
        List<ApiFieldError> fields
) {}
