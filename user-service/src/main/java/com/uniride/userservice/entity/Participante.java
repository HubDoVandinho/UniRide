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

    // Nome social — exibido no lugar do nome quando preenchido
    @Column(name = "nome_social", length = 120)
    private String nomeSocial;

    // Identificador público único — exibido como @username
    @Column(nullable = false, unique = true, length = 30)
    private String username;

    // Credencial permanente de login — nunca expira, independe da instituição
    @Column(name = "email_pessoal", nullable = false, unique = true, length = 180)
    private String emailPessoal;

    // Usado uma vez no cadastro para provar vínculo universitário
    @Column(name = "email_institucional", nullable = false, unique = true, length = 180)
    private String emailInstitucional;

    // Token de ativação enviado para o emailInstitucional
    @Column(name = "token_confirmacao", length = 64)
    private String tokenConfirmacao;

    @Column(name = "token_confirmacao_expira_em")
    private LocalDateTime tokenConfirmacaoExpiraEm;

    // OTP de redefinição de senha (6 dígitos, expira em 15 min)
    @Column(name = "token_reset_senha", length = 6)
    private String tokenResetSenha;

    @Column(name = "token_reset_senha_expira_em")
    private LocalDateTime tokenResetSenhaExpiraEm;

    @Column(name = "senha_hash", nullable = false)
    private String senhaHash;

    @Column(nullable = false, unique = true, length = 11)
    private String cpf;

    @Column(name = "mini_biografia", length = 500)
    private String miniBiografia;

    @Column(name = "foto_perfil_url", columnDefinition = "TEXT")
    private String fotoPerfilUrl;

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

    @Column(name = "media_avaliacoes")
    private Double mediaAvaliacoes;

    // Token do dispositivo para notificações push (Expo Push Token)
    @Column(name = "push_token", length = 200)
    private String pushToken;

    @PrePersist
    protected void prePersist() {
        if (status == null) status = StatusParticipante.PENDENTE_VERIFICACAO;
        if (verificado == null) verificado = false;
    }
}