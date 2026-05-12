package com.uniride.userservice.dto.response;

import lombok.Builder;
import lombok.Data;

@Data @Builder
public class TipoPreferenciaResponse {
    private Long id;
    private String nome;
    private String descricao;
    private boolean custom;
}
