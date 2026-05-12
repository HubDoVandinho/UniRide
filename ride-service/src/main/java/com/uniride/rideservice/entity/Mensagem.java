package com.uniride.rideservice.entity;

import com.uniride.rideservice.enums.TipoMensagem;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "mensagens_chat")
@Getter @Setter @NoArgsConstructor
public class Mensagem {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "carona_id", nullable = false)
    private Long caronaId;

    @Column(name = "remetente_id", nullable = false)
    private Long remetenteId;

    @Column(columnDefinition = "TEXT")
    private String conteudo;

    @Column(name = "imagem_base64", columnDefinition = "LONGTEXT")
    private String imagemBase64;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TipoMensagem tipo = TipoMensagem.TEXTO;

    @CreationTimestamp
    @Column(name = "criado_em", updatable = false)
    private LocalDateTime criadoEm;
}
