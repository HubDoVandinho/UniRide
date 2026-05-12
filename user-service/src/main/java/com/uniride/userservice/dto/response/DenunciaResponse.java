package com.uniride.userservice.dto.response;

import com.uniride.userservice.enums.MotivoDenuncia;
import com.uniride.userservice.enums.StatusDenuncia;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter @Builder
public class DenunciaResponse {
    private Long id;
    private Long denuncianteId;
    private String nomeDenunciante;
    private Long denunciadoId;
    private String nomeDenunciado;
    private Long caronaId;
    private MotivoDenuncia motivo;
    private String descricao;
    private StatusDenuncia status;
    private String notaAdmin;
    private LocalDateTime criadoEm;
    private LocalDateTime revisadoEm;
}
