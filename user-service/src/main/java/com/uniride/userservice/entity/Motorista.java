package com.uniride.userservice.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

@Entity
@DiscriminatorValue("MOTORISTA")
@Getter @Setter @NoArgsConstructor
public class Motorista extends Participante {

    @Column(unique = true, length = 11)
    private String cnh;

    @Column(name = "validade_cnh")
    private LocalDate validadeCnh;

    @Column(name = "aprovado_admin")
    private Boolean aprovadoAdmin = false;

    @Column(name = "total_caronas_oferecidas")
    private Integer totalCaronasOferecidas = 0;

    @OneToOne(mappedBy = "motorista", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private Veiculo veiculo;
}
