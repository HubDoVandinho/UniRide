package com.uniride.rideservice.entity;

import com.uniride.rideservice.enums.DiaSemana;
import com.uniride.rideservice.enums.Direcao;
import com.uniride.rideservice.enums.StatusRotina;
import com.uniride.rideservice.enums.Turno;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "rotinas")
@Getter @Setter @NoArgsConstructor
public class Rotina {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "motorista_id", nullable = false)
    private Long motoristaId;

    @Column(name = "instituicao_id", nullable = false)
    private Long instituicaoId;

    // ── Localização ───────────────────────────────────────────
    @Column(nullable = false, length = 500)
    private String origem;

    @Column(name = "bairro_origem", nullable = false, length = 100)
    private String bairroOrigem;

    @Column(nullable = false, length = 500)
    private String destino;

    @Column(name = "bairro_destino", nullable = false, length = 100)
    private String bairroDestino;

    @Column(name = "lat_origem")
    private Double latOrigem;

    @Column(name = "lng_origem")
    private Double lngOrigem;

    @Column(name = "lat_destino")
    private Double latDestino;

    @Column(name = "lng_destino")
    private Double lngDestino;

    // ── Raio que o motorista aceita se desviar (km) ───────────
    @Column(name = "raio_aceito")
    private Double raioAceito = 2.0;

    // ── Horário ───────────────────────────────────────────────
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "rotina_dias", joinColumns = @JoinColumn(name = "rotina_id"))
    @Enumerated(EnumType.STRING)
    @Column(name = "dia")
    private Set<DiaSemana> diasDaSemana = new HashSet<>();

    @Column(name = "horario_saida", nullable = false)
    private LocalTime horarioSaida;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private Turno turno;

    // ── Valor sugerido (contribuição voluntária) ──────────────
    @Column(name = "valor_sugerido", precision = 6, scale = 2)
    private BigDecimal valorSugerido;

    @Column(name = "vagas_total", nullable = false)
    private Integer vagasTotal;

    @Column(name = "modo_fixo", nullable = false)
    private Boolean modoFixo = false;

    // ── Período ───────────────────────────────────────────────
    @Column(name = "data_inicio", nullable = false)
    private LocalDate dataInicio;

    @Column(name = "data_fim")
    private LocalDate dataFim;

    // ── Direção ───────────────────────────────────────────────
    @Enumerated(EnumType.STRING)
    @Column(length = 10)
    private Direcao direcao;

    // ── Status ────────────────────────────────────────────────
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private StatusRotina status = StatusRotina.ATIVA;

    // ── Nome amigável (opcional) ──────────────────────────────
    @Column(length = 100)
    private String nome;

    // ── Observações do motorista ──────────────────────────────
    @Column(length = 500)
    private String observacoes;

    // ── Chave PIX do motorista (herdada pelas caronas geradas) ──
    @Column(name = "pix_key", length = 150)
    private String pixKey;

    @PrePersist @PreUpdate
    private void derivarTurno() {
        if (horarioSaida != null) {
            int h = horarioSaida.getHour();
            turno = h >= 5 && h < 12 ? Turno.MANHA : h >= 12 && h < 18 ? Turno.TARDE : Turno.NOITE;
        }
    }
}
