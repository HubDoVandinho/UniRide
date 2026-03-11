package com.uniride.userservice.exception;

import org.springframework.http.HttpStatus;

public class TokenInvalidoException extends UniRideException {
    public TokenInvalidoException() {
        super("Token inválido ou expirado.", HttpStatus.UNAUTHORIZED);
    }
}
