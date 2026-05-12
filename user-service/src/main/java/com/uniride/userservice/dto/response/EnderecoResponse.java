package com.uniride.userservice.dto.response;

import lombok.Builder;
import lombok.Data;

@Data @Builder
public class EnderecoResponse {
    private Long id;
    private String nome;
    private String rua;
    private String numero;
    private String bairro;
    private String cep;
    private String cidade;
    private String estado;
    private Double lat;
    private Double lng;
}
