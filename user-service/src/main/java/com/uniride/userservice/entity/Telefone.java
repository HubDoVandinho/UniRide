package com.uniride.userservice.entity;

import com.uniride.userservice.enums.TipoTelefone;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "telefones")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Telefone {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 3)
    private String ddd;

    @Column(nullable = false, length = 10)
    private String numero;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TipoTelefone tipo;

    @Column(nullable = false)
    private Boolean principal = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "participante_id", nullable = false)
    private Participante participante;
}
