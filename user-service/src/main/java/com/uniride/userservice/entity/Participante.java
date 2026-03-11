package com.uniride.userservice.entity;

import com.uniride.userservice.enums.StatusParticipante;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "participantes")
@Inheritance(strategy = InheritanceType.SINGLE_TABLE)
@DiscriminatorColumn(name = "dtype", discriminatorType = DiscriminatorType.STRING, length = 20)
@Getter @Setter @NoArgsConstructor
public abstract class Participante {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 120)
    private String nome;

    @Column(nullable = false, unique = true, length = 180)
    private String email;

    @Column(name = "senha_hash", nullable = false)
    private String senhaHash;

    @Column(nullable = false, unique = true, length = 11)
    private String cpf;

    @Column(name = "mini_biografia", length = 500)
    private String miniBiografia;

    @Column(nullable = false)
    private Boolean verificado = false;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private StatusParticipante status = StatusParticipante.PENDENTE_VERIFICACAO;

    @CreationTimestamp
    @Column(name = "criado_em", nullable = false, updatable = false)
    private LocalDateTime criadoEm;

    @UpdateTimestamp
    @Column(name = "atualizado_em")
    private LocalDateTime atualizadoEm;

    @OneToMany(mappedBy = "participante", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<Endereco> enderecos = new ArrayList<>();

    @OneToMany(mappedBy = "participante", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<Telefone> telefones = new ArrayList<>();

    // Apenas o ID — detalhes buscados via institution-service
    @Column(name = "instituicao_id")
    private Long instituicaoId;

    @PrePersist
    protected void prePersist() {
        if (status == null) status = StatusParticipante.PENDENTE_VERIFICACAO;
        if (verificado == null) verificado = false;
    }
}