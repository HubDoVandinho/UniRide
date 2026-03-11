package com.uniride.userservice.exception;

import org.springframework.http.HttpStatus;

public class RecursoNaoEncontradoException extends UniRideException {
    public RecursoNaoEncontradoException(String recurso) {
        super(recurso + " não encontrado(a).", HttpStatus.NOT_FOUND);
    }
}
