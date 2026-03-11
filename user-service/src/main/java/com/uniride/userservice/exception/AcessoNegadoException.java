package com.uniride.userservice.exception;

import org.springframework.http.HttpStatus;

public class AcessoNegadoException extends UniRideException {
    public AcessoNegadoException() {
        super("Você não tem permissão para realizar esta ação.", HttpStatus.FORBIDDEN);
    }
}
