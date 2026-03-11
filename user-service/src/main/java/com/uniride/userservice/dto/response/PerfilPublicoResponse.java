package com.uniride.userservice.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class PerfilPublicoResponse {

    private Long id;
    private String nome;           // nome + sobrenome ou nome social
    private String fotoPerfil;     // URL futura
    private String instituicao;    // nome da instituição
    private String tipo;           // PASSAGEIRO ou MOTORISTA
    private Double avaliacaoMedia; // calculada pelo ride-service futuramente
    private Boolean verificado;    // comprovante de matrícula validado
}
