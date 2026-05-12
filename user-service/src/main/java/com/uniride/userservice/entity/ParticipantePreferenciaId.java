package com.uniride.userservice.entity;

import lombok.*;
import java.io.Serializable;

@Data @NoArgsConstructor @AllArgsConstructor
public class ParticipantePreferenciaId implements Serializable {
    private Long participanteId;
    private Long tipoPreferenciaId;
}
