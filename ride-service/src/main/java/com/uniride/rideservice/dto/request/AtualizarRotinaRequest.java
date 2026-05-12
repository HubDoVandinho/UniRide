package com.uniride.rideservice.dto.request;

import com.uniride.rideservice.enums.DiaSemana;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalTime;
import java.util.Set;

@Getter @Setter @NoArgsConstructor
public class AtualizarRotinaRequest {

    private String nome;

    private LocalTime horarioSaida;

    private Set<DiaSemana> diasDaSemana;

    @DecimalMin(value = "0.5", message = "Raio mínimo de 0.5 km.")
    @DecimalMax(value = "10.0", message = "Raio máximo de 10 km.")
    private Double raioAceito;

    private String observacoes;

    private String pixKey;
}
