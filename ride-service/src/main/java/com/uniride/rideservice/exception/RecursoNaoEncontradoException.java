package com.uniride.rideservice.exception;

public class RecursoNaoEncontradoException extends RuntimeException {
    public RecursoNaoEncontradoException(String recurso) {
        super(recurso + " não encontrado.");
    }
}
