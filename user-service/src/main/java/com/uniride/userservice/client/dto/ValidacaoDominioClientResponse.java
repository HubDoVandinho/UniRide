package com.uniride.userservice.client.dto;

import lombok.Data;

@Data
public class ValidacaoDominioClientResponse {
    private boolean valido;
    private Long instituicaoId;
    private String nome;
    private String cidade;
    private String estado;
}