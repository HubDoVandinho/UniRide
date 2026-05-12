package com.uniride.userservice.exception;

import org.springframework.http.HttpStatus;

public class ContaNaoConfirmadaException extends UniRideException {
    public ContaNaoConfirmadaException() {
        super("Sua conta ainda não foi confirmada. Verifique seu e-mail institucional.", HttpStatus.FORBIDDEN);
    }
}
