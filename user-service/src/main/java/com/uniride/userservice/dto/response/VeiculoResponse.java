package com.uniride.userservice.dto.response;

import com.uniride.userservice.enums.TipoCombustivel;
import com.uniride.userservice.enums.TipoVeiculo;
import lombok.Builder;
import lombok.Data;

@Data @Builder
public class VeiculoResponse {
    private Long id;
    private String placa;
    private TipoVeiculo tipo;
    private String modelo;
    private String marca;
    private Integer ano;
    private String cor;
    private Integer capacidade;
    private Boolean temSeguro;
    private Boolean acessivel;
    private TipoCombustivel tipoCombustivel;
    private Integer qtdPortas;
    private String cilindrada;
    private Boolean temBauleto;
}
