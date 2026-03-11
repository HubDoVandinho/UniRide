package com.uniride.userservice.dto.response;

import lombok.Builder;
import lombok.Data;

@Data @Builder
public class InstituicaoResponse {
    private Long id;
    private String nome;
    private String sigla;
    private String cidade;
    private String rua;
    private String numero;
    private String bairro;
    private String cep;
    private String estado;
}