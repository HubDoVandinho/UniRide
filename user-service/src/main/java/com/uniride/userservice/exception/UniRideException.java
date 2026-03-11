package com.uniride.userservice.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public class UniRideException extends RuntimeException {
    private final HttpStatus status;

    public UniRideException(String message, HttpStatus status) {
        super(message);
        this.status = status;
    }
}
