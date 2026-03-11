package com.uniride.userservice.dto.request;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class AtualizarPerfilRequest {

    @Size(min = 3, max = 120)
    private String nome;

    @Size(max = 500)
    private String miniBiografia;

    private Long instituicaoId;
}
