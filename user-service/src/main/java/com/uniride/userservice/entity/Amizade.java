package com.uniride.userservice.entity;

import com.uniride.userservice.enums.StatusAmizade;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(
    name = "amizades",
    uniqueConstraints = @UniqueConstraint(
        name = "uk_amizade_solicitante_destinatario",
        columnNames = {"solicitante_id", "destinatario_id"}
    )
)
@Getter @Setter @NoArgsConstructor
public class Amizade {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "solicitante_id", nullable = false)
    private Participante solicitante;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "destinatario_id", nullable = false)
    private Participante destinatario;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private StatusAmizade status = StatusAmizade.PENDENTE;

    @CreationTimestamp
    @Column(name = "criado_em", nullable = false, updatable = false)
    private LocalDateTime criadoEm;

    @UpdateTimestamp
    @Column(name = "atualizado_em")
    private LocalDateTime atualizadoEm;
}
