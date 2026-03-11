package com.uniride.userservice.exception;

import org.springframework.http.HttpStatus;

public class ConflictException extends UniRideException {
    public ConflictException(String mensagem) {
        super(mensagem, HttpStatus.CONFLICT);
    }
}
