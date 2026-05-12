package com.uniride.rideservice.dto.response;

import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SaoAmigosResponse {
    private Long idA;
    private Long idB;
    private boolean amigos;
}
