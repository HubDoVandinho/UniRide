package com.uniride.rideservice.dto.response;

import com.uniride.rideservice.enums.Direcao;
import com.uniride.rideservice.enums.StatusCarona;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CaronaResponse {
    private Long id;
    private Long rotinaId;
    private Long motoristaId;
    private String origem;
    private String bairroOrigem;
    private String destino;
    private String bairroDestino;
    private Double latOrigem;
    private Double lngOrigem;
    private Double latDestino;
    private Double lngDestino;
    private LocalDate data;
    private LocalTime horarioSaida;
    private Integer vagasTotal;
    private Integer vagasDisponiveis;
    private BigDecimal valorSugerido;
    private BigDecimal custoTotal;
    private StatusCarona status;
    private Direcao direcao;
    private String observacoes;
    private String nome;
    private String pixKey;
    // Raio aceito pelo motorista (km)
    private Double raioAceito;
    // Links de navegação
    private String linkGoogleMaps;
    private String linkWaze;
    // Distância do usuário (busca por GPS)
    private Double distanciaKm;
    // Indica se o usuário atual já avaliou os passageiros desta carona
    private boolean jaAvaliouPassageiros;
    // Indica se o usuário atual já é participante (motorista ou passageiro aprovado/embarcado)
    private boolean eParticipante;
    // Veículo do motorista (snapshot para exibição nos cards)
    private String veiculoPlaca;
    private String veiculoTipo;
    private String veiculoMarca;
    private String veiculoModelo;
}
