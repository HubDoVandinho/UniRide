package com.uniride.rideservice.entity;

import com.uniride.rideservice.enums.Direcao;
import com.uniride.rideservice.enums.StatusCarona;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Table(name = "caronas")
@Getter @Setter @NoArgsConstructor
public class Carona {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rotina_id", insertable = false, updatable = false)
    private Rotina rotina;

    @Column(name = "rotina_id")
    private Long rotinaId;

    @Column(name = "motorista_id", nullable = false)
    private Long motoristaId;

    @Column(name = "instituicao_id", nullable = false)
    private Long instituicaoId;

    // ── Nome (snapshot da rotina, nullable para caronas avulsas) ──
    @Column(length = 100)
    private String nome;

    // ── Rota ──────────────────────────────────────────────────
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

    // ── Data/Hora ─────────────────────────────────────────────
    @Column(nullable = false)
    private LocalDate data;

    @Column(name = "horario_saida", nullable = false)
    private LocalTime horarioSaida;

    // ── Vagas / Valor sugerido ────────────────────────────────
    @Column(name = "vagas_total", nullable = false)
    private Integer vagasTotal;

    @Column(name = "vagas_disponiveis", nullable = false)
    private Integer vagasDisponiveis;

    @Column(name = "valor_sugerido", precision = 6, scale = 2)
    private BigDecimal valorSugerido;

    // ── Direção ───────────────────────────────────────────────
    @Enumerated(EnumType.STRING)
    @Column(length = 10)
    private Direcao direcao;

    // ── Status ────────────────────────────────────────────────
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private StatusCarona status = StatusCarona.AGENDADA;

    // ── Raio aceito (snapshot da rotina, km) ─────────────────
    @Column(name = "raio_aceito")
    private Double raioAceito = 2.0;

    @Column(length = 500)
    private String observacoes;

    // ── Chave PIX (snapshot da rotina) ────────────────────────
    @Column(name = "pix_key", length = 150)
    private String pixKey;

    @CreationTimestamp
    @Column(name = "criado_em", updatable = false)
    private LocalDateTime criadoEm;
}
