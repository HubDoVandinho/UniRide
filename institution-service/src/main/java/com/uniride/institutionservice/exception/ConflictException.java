package com.uniride.institutionservice.exception;

import org.springframework.http.HttpStatus;

public class ConflictException extends UniRideException {
    public ConflictException(String message) {
        super(message, HttpStatus.CONFLICT);
    }
}
