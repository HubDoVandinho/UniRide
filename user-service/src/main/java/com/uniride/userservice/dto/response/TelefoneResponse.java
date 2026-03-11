package com.uniride.userservice.dto.response;

import com.uniride.userservice.enums.TipoTelefone;
import lombok.Builder;
import lombok.Data;

@Data @Builder
public class TelefoneResponse {
    private Long id;
    private String ddd;
    private String numero;
    private TipoTelefone tipo;
    private Boolean principal;
}
