package com.uniride.userservice.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "enderecos")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Endereco {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(length = 60)
    private String nome;

    @Column(nullable = false, length = 200)
    private String rua;

    @Column(length = 20)
    private String numero;

    @Column(nullable = false, length = 100)
    private String bairro;

    @Column(nullable = false, length = 8)
    private String cep;

    @Column(nullable = false, length = 100)
    private String cidade;

    @Column(nullable = false, length = 2)
    private String estado;

    // Coordenadas geocodificadas no momento do cadastro (via Nominatim no frontend)
    @Column(name = "lat")
    private Double lat;

    @Column(name = "lng")
    private Double lng;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "participante_id", nullable = false)
    private Participante participante;
}
