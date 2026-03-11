package com.uniride.userservice.entity;

import com.uniride.userservice.enums.TipoCombustivel;
import com.uniride.userservice.enums.TipoVeiculo;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "veiculos")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Veiculo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 10)
    private String placa;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TipoVeiculo tipo;

    @Column(nullable = false, length = 100)
    private String modelo;

    @Column(nullable = false, length = 100)
    private String marca;

    @Column(nullable = false)
    private Integer ano;

    @Column(nullable = false, length = 60)
    private String cor;

    @Column(nullable = false)
    private Integer capacidade;

    @Column(name = "tem_seguro", nullable = false)
    private Boolean temSeguro = false;

    @Column(nullable = false)
    private Boolean acessivel = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_combustivel", length = 20)
    private TipoCombustivel tipoCombustivel;

    // Específico CARRO
    @Column(name = "qtd_portas")
    private Integer qtdPortas;

    // Específico MOTOCICLETA
    @Column(length = 20)
    private String cilindrada;

    @Column(name = "tem_bauleto")
    private Boolean temBauleto;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "motorista_id", nullable = false, unique = true)
    private Motorista motorista;
}
