package com.uniride.userservice.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter @Builder
public class BloqueioResponse {
    private Long id;
    private Long bloqueadoId;
    private String nomeBloqueado;
    private String fotoBloqueado;
    private LocalDateTime criadoEm;
}
