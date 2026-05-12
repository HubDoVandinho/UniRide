package com.uniride.rideservice.dto.request;

import com.uniride.rideservice.enums.DiaSemana;
import com.uniride.rideservice.enums.Direcao;
import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Set;

@Getter @Setter @NoArgsConstructor
public class CriarRotinaRequest {

    @NotBlank(message = "Origem é obrigatória.")
    private String origem;

    @NotBlank(message = "Bairro de origem é obrigatório.")
    private String bairroOrigem;

    @NotBlank(message = "Destino é obrigatório.")
    private String destino;

    @NotBlank(message = "Bairro de destino é obrigatório.")
    private String bairroDestino;

    @NotNull(message = "Não foi possível localizar o endereço de origem. Verifique sua conexão e tente novamente.")
    private Double latOrigem;

    @NotNull(message = "Não foi possível localizar o endereço de origem. Verifique sua conexão e tente novamente.")
    private Double lngOrigem;

    @NotNull(message = "Não foi possível localizar o endereço de destino. Verifique sua conexão e tente novamente.")
    private Double latDestino;

    @NotNull(message = "Não foi possível localizar o endereço de destino. Verifique sua conexão e tente novamente.")
    private Double lngDestino;

    @DecimalMin(value = "0.5", message = "Raio mínimo de 0.5 km.")
    @DecimalMax(value = "10.0", message = "Raio máximo de 10 km.")
    private Double raioAceito = 2.0;

    @NotEmpty(message = "Informe ao menos um dia da semana.")
    private Set<DiaSemana> diasDaSemana;

    @NotNull(message = "Horário de saída é obrigatório.")
    private LocalTime horarioSaida;

    @DecimalMin(value = "0.00", message = "Valor não pode ser negativo.")
    private BigDecimal valorSugerido;

    @NotNull(message = "Total de vagas é obrigatório.")
    @Min(value = 1, message = "Mínimo de 1 vaga.")
    @Max(value = 8, message = "Máximo de 8 vagas.")
    private Integer vagasTotal;

    private Boolean modoFixo = false;

    @NotNull(message = "Data de início é obrigatória.")
    private LocalDate dataInicio;

    private LocalDate dataFim;
    private String nome;
    private String observacoes;
    private String pixKey;

    @NotNull(message = "Direção é obrigatória (IDA ou VOLTA).")
    private Direcao direcao;
}
