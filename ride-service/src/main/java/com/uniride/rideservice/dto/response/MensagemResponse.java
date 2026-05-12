package com.uniride.rideservice.dto.response;

import com.uniride.rideservice.enums.TipoMensagem;
import lombok.*;

import java.time.LocalDateTime;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MensagemResponse {
    private Long id;
    private Long caronaId;
    private Long remetenteId;
    private String nomeRemetente;
    private String fotoRemetente;
    private String conteudo;
    private String imagemBase64;
    private TipoMensagem tipo;
    private LocalDateTime criadoEm;
}
