package com.uniride.rideservice.dto.request;

import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter @Setter @NoArgsConstructor
public class AvaliacaoRequest {
    @NotNull private Long avaliadoId;
    @NotNull private Long caronaId;
    @NotNull @Min(1) @Max(5) private Integer nota;
    private String comentario;
    /** Frases pré-definidas selecionadas pelo avaliador. */
    private List<String> tags;
}
