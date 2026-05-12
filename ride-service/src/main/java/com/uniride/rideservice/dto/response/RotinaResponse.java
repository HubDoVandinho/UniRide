package com.uniride.rideservice.dto.response;

import com.uniride.rideservice.enums.DiaSemana;
import com.uniride.rideservice.enums.Direcao;
import com.uniride.rideservice.enums.StatusRotina;
import com.uniride.rideservice.enums.Turno;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Set;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RotinaResponse {
    private Long id;
    private Long motoristaId;
    private String origem;
    private String bairroOrigem;
    private String destino;
    private String bairroDestino;
    private Double latOrigem;
    private Double lngOrigem;
    private Double latDestino;
    private Double lngDestino;
    private Double raioAceito;
    private Set<DiaSemana> diasDaSemana;
    private LocalTime horarioSaida;
    private Turno turno;
    private BigDecimal valorSugerido;
    private Integer vagasTotal;
    private Boolean modoFixo;
    private LocalDate dataInicio;
    private LocalDate dataFim;
    private StatusRotina status;
    private String nome;
    private String observacoes;
    private String pixKey;
    private Direcao direcao;
    // Calculado na busca por GPS
    private Double distanciaKm;
}
