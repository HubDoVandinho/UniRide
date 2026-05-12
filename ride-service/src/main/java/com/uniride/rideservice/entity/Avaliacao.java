package com.uniride.rideservice.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "avaliacoes",
       uniqueConstraints = @UniqueConstraint(columnNames = {"avaliador_id", "avaliado_id", "carona_id"}))
@Getter @Setter @NoArgsConstructor
public class Avaliacao {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "avaliador_id", nullable = false)
    private Long avaliadorId;

    @Column(name = "avaliado_id", nullable = false)
    private Long avaliadoId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "carona_id", nullable = false)
    private Carona carona;

    @Column(nullable = false)
    private Integer nota;

    @Column(length = 500)
    private String comentario;

    // Frases pré-definidas escolhidas pelo avaliador; armazenadas separadas por vírgula
    @Column(name = "tags", length = 1000)
    private String tags;

    @CreationTimestamp
    @Column(name = "criado_em", updatable = false)
    private LocalDateTime criadoEm;
}
