package com.uniride.userservice.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@DiscriminatorValue("PASSAGEIRO")
@Getter @Setter @NoArgsConstructor
public class Passageiro extends Participante {

    @Column(name = "necessidades_especiais", length = 500)
    private String necessidadesEspeciais;

    @Column(name = "total_caronas_solicitadas")
    private Integer totalCaronasSolicitadas = 0;
}