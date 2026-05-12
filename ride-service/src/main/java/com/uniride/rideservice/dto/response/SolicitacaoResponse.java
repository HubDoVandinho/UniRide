package com.uniride.rideservice.dto.response;

import com.uniride.rideservice.enums.Direcao;
import com.uniride.rideservice.enums.StatusPagamento;
import com.uniride.rideservice.enums.StatusSolicitacao;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SolicitacaoResponse {
    private Long id;
    private Long caronaId;
    private Long passageiroId;
    private String nomePassageiro;
    private String fotoPassageiro;
    private Double latDestino;
    private Double lngDestino;
    private String enderecoDestino;
    private String nomeCarona;
    private Direcao direcao;
    private StatusSolicitacao status;
    private StatusPagamento statusPagamento;
    private String mensagem;
    private String pinEmbarque;
    private LocalDateTime criadoEm;
    private boolean jaAvaliouMotorista;
    // Campos da carona (para exibição nos cards)
    private LocalDate dataCarona;
    private LocalTime horarioSaida;
    private Integer vagasDisponiveis;
    private Integer vagasTotal;
}
