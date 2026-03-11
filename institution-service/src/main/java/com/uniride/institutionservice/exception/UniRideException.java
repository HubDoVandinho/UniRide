package com.uniride.institutionservice.exception;

import org.springframework.http.HttpStatus;

public class UniRideException extends RuntimeException {
    private final HttpStatus status;

    public UniRideException(String message, HttpStatus status) {
        super(message);
        this.status = status;
    }

    public HttpStatus getStatus() { return status; }
}
