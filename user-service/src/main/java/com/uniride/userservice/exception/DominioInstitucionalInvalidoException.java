package com.uniride.userservice.exception;

import org.springframework.http.HttpStatus;

public class DominioInstitucionalInvalidoException extends UniRideException {

    public DominioInstitucionalInvalidoException(String message) {
        super(message, HttpStatus.UNPROCESSABLE_ENTITY);
    }
}
