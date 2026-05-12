package com.uniride.userservice.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(
    name = "bloqueios",
    uniqueConstraints = @UniqueConstraint(columnNames = {"bloqueador_id", "bloqueado_id"})
)
@Getter @Setter @NoArgsConstructor
public class Bloqueio {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "bloqueador_id", nullable = false)
    private Long bloqueadorId;

    @Column(name = "bloqueado_id", nullable = false)
    private Long bloqueadoId;

    @CreationTimestamp
    @Column(name = "criado_em", nullable = false, updatable = false)
    private LocalDateTime criadoEm;
}
