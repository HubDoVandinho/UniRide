package com.uniride.userservice.exception;

import org.springframework.http.HttpStatus;

public class ContaBloqueadaException extends UniRideException {
    public ContaBloqueadaException() {
        super("Conta bloqueada temporariamente. Tente novamente mais tarde.", HttpStatus.TOO_MANY_REQUESTS);
    }
}
