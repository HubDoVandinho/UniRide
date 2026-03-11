package com.uniride.userservice.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class SaoAmigosResponse {
    private Long idA;
    private Long idB;
    private boolean amigos;
}
