package com.uniride.userservice.entity;

import com.uniride.userservice.enums.MotivoDenuncia;
import com.uniride.userservice.enums.StatusDenuncia;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "denuncias")
@Getter @Setter @NoArgsConstructor
public class Denuncia {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "denunciante_id", nullable = false)
    private Long denuncianteId;

    @Column(name = "denunciado_id", nullable = false)
    private Long denunciadoId;

    @Column(name = "carona_id")
    private Long caronaId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private MotivoDenuncia motivo;

    @Column(length = 1000)
    private String descricao;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 25)
    private StatusDenuncia status = StatusDenuncia.PENDENTE;

    @Column(name = "nota_admin", length = 500)
    private String notaAdmin;

    @CreationTimestamp
    @Column(name = "criado_em", nullable = false, updatable = false)
    private LocalDateTime criadoEm;

    @Column(name = "revisado_em")
    private LocalDateTime revisadoEm;
}
