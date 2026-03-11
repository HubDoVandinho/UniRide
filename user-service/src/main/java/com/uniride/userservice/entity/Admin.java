package com.uniride.userservice.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@DiscriminatorValue("ADMIN")
@Getter @Setter @NoArgsConstructor
public class Admin extends Participante {
    // Admin não tem campos extras — herda tudo de Participante
}