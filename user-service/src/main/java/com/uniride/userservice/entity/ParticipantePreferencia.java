package com.uniride.userservice.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "participante_preferencias")
@Getter @Setter @NoArgsConstructor
@IdClass(ParticipantePreferenciaId.class)
public class ParticipantePreferencia {

    @Id
    @Column(name = "participante_id")
    private Long participanteId;

    @Id
    @Column(name = "tipo_preferencia_id")
    private Long tipoPreferenciaId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "participante_id", insertable = false, updatable = false)
    private Participante participante;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tipo_preferencia_id", insertable = false, updatable = false)
    private TipoPreferencia tipoPreferencia;
}
