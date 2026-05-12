package com.uniride.rideservice.dto.response;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

@Getter @Setter @NoArgsConstructor
public class VeiculoInfoResponse {
    private String    placa;
    private String    tipo;
    private String    marca;
    private String    modelo;
    private Integer   capacidade;
    private LocalDate validadeCnh;
    private Boolean   aprovadoAdmin;
}
