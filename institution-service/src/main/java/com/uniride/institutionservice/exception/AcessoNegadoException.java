package com.uniride.institutionservice.exception;

import org.springframework.http.HttpStatus;

public class AcessoNegadoException extends UniRideException {
    public AcessoNegadoException() {
        super("Acesso negado.", HttpStatus.FORBIDDEN);
    }
}
