package com.uniride.rideservice.dto.response;

import lombok.*;
import java.time.LocalDateTime;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AvaliacaoResponse {
    private Long id;
    private Long avaliadorId;
    private Long avaliadoId;
    private Long caronaId;
    private Integer nota;
    private String comentario;
    private List<String> tags;
    private LocalDateTime criadoEm;
}
