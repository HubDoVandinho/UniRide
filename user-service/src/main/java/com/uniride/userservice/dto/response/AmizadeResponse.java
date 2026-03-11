package com.uniride.userservice.dto.response;

import com.uniride.userservice.enums.StatusAmizade;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class AmizadeResponse {

    private Long id;
    private StatusAmizade status;
    private LocalDateTime criadoEm;
    private LocalDateTime atualizadoEm;

    // Dados públicos do solicitante
    private PerfilPublicoResponse solicitante;

    // Dados públicos do destinatário
    private PerfilPublicoResponse destinatario;
}
