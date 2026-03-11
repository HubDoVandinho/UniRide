package com.uniride.userservice.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "tentativas_login", indexes = {
    @Index(name = "idx_tentativa_email", columnList = "email"),
    @Index(name = "idx_tentativa_ip", columnList = "ip_origem")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TentativaLogin {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 180)
    private String email;

    @Column(nullable = false)
    private Boolean sucesso;

    @Column(name = "ip_origem", length = 60)
    private String ipOrigem;

    @CreationTimestamp
    @Column(name = "data_hora", nullable = false, updatable = false)
    private LocalDateTime dataHora;
}
