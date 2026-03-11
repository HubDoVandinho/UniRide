package com.uniride.institutionservice.entity;

import com.uniride.institutionservice.enums.StatusInstituicao;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "instituicoes")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Instituicao {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String nome;

    @Column(name = "sigla", length = 20)
    private String sigla;

    @Column(name = "dominio_email", nullable = false, unique = true, length = 100)
    private String dominioEmail;

    @Column(name = "tipo", length = 50)
    private String tipo; // ex: Faculdade, Universidade, Instituto Federal

    // Endereço
    @Column(length = 200)
    private String rua;

    @Column(length = 20)
    private String numero;

    @Column(length = 100)
    private String bairro;

    @Column(nullable = false, length = 100)
    private String cidade;

    @Column(nullable = false, length = 2)
    private String estado;

    @Column(length = 8)
    private String cep;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private StatusInstituicao status = StatusInstituicao.ATIVA;

    @CreationTimestamp
    @Column(name = "criado_em", nullable = false, updatable = false)
    private LocalDateTime criadoEm;

    @UpdateTimestamp
    @Column(name = "atualizado_em")
    private LocalDateTime atualizadoEm;
}
