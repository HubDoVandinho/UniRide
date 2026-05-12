package com.uniride.userservice.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "tipos_preferencia")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TipoPreferencia {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 100)
    private String nome;

    @Column(length = 255)
    private String descricao;

    @Column(nullable = false)
    private Boolean ativo = true;

    /** AMBOS = aparece para motorista e passageiro; MOTORISTA = só motorista; PASSAGEIRO = só passageiro */
    @Column(nullable = false, length = 20)
    private String destinatario = "AMBOS";

    /** Preenchido apenas para preferências criadas pelo próprio usuário (custom). Null = global/admin. */
    @Column(name = "criado_por_participante_id")
    private Long criadoPorParticipanteId;
}
