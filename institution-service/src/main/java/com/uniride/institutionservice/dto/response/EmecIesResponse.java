package com.uniride.institutionservice.dto.response;

import lombok.Builder;
import lombok.Data;

/**
 * DTO que representa uma IES retornada pela API pública do e-MEC.
 */
@Data
@Builder
public class EmecIesResponse {
    private String codigoEmec;
    private String nome;
    private String municipio;
    private String uf;
    private String organizacaoAcademica;  // ex: Universidade, Faculdade de Tecnologia
    private String situacao;              // ex: Ativa, Em Extinção
}
