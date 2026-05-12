package com.uniride.rideservice.dto.request;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter @Setter @NoArgsConstructor
public class SolicitarVagaRequest {
    private Double latDestino;
    private Double lngDestino;
    private String enderecoDestino;
    private String mensagem;
}
