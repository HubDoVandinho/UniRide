package com.uniride.institutionservice.dto.response;

import com.uniride.institutionservice.enums.StatusInstituicao;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class InstituicaoResponse {
    private Long id;
    private String nome;
    private String sigla;
    private String dominioEmail;
    private String tipo;
    private String rua;
    private String numero;
    private String bairro;
    private String cidade;
    private String estado;
    private String cep;
    private StatusInstituicao status;
    private LocalDateTime criadoEm;
    private LocalDateTime atualizadoEm;
}
