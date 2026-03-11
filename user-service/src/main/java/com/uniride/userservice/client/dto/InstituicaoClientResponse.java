package com.uniride.userservice.client.dto;

import lombok.Data;

@Data
public class InstituicaoClientResponse {
    private Long id;
    private String nome;
    private String sigla;
    private String dominioEmail;
    private String tipo;
    private String cidade;
    private String estado;
    private String cep;
    private String rua;
    private String numero;
    private String bairro;
    private String status;
}