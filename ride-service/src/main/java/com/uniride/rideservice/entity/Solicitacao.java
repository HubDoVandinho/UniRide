package com.uniride.rideservice.entity;

import com.uniride.rideservice.enums.StatusPagamento;
import com.uniride.rideservice.enums.StatusSolicitacao;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "solicitacoes")
@Getter @Setter @NoArgsConstructor
public class Solicitacao {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "carona_id", nullable = false)
    private Carona carona;

    @Column(name = "passageiro_id", nullable = false)
    private Long passageiroId;

    // ── Destino do passageiro ─────────────────────────────────
    @Column(name = "lat_destino")
    private Double latDestino;

    @Column(name = "lng_destino")
    private Double lngDestino;

    @Column(name = "endereco_destino", length = 500)
    private String enderecoDestino;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private StatusSolicitacao status = StatusSolicitacao.PENDENTE;

    @Enumerated(EnumType.STRING)
    @Column(name = "status_pagamento", nullable = false, length = 25)
    private StatusPagamento statusPagamento = StatusPagamento.PENDENTE;

    @Column(length = 300)
    private String mensagem;

    @Column(name = "pin_embarque", length = 4)
    private String pinEmbarque;

    @CreationTimestamp
    @Column(name = "criado_em", updatable = false)
    private LocalDateTime criadoEm;

    @UpdateTimestamp
    @Column(name = "atualizado_em")
    private LocalDateTime atualizadoEm;
}
