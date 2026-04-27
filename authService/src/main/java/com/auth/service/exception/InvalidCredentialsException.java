package com.auth.auth.exception;

import org.springframework.http.HttpStatus;

public class InvalidCredentialsException extends ApiException {
    public InvalidCredentialsException(String message) {
        super(HttpStatus.BAD_REQUEST, "INVALID_CREDENTIALS", message);
    }
}
