package com.uniride.userservice.exception;

import org.springframework.http.HttpStatus;

public class CredenciaisInvalidasException extends UniRideException {
    public CredenciaisInvalidasException() {
        super("E-mail ou senha inválidos.", HttpStatus.UNAUTHORIZED);
    }
}
