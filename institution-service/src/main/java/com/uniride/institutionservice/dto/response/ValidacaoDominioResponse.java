package com.uniride.institutionservice.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ValidacaoDominioResponse {
    private boolean valido;
    private Long instituicaoId;
    private String nome;
    private String cidade;
    private String estado;
}
