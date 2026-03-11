package com.uniride.userservice.client;

import lombok.Data;

@Data
public class ApiClientResponse<T> {
    private boolean sucesso;
    private String mensagem;
    private T dados;
}