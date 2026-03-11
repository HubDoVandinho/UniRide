package com.uniride.userservice.dto.request;

import com.uniride.userservice.enums.TipoCombustivel;
import com.uniride.userservice.enums.TipoVeiculo;
import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class CadastroVeiculoRequest {

    @NotBlank(message = "Placa é obrigatória")
    @Pattern(
        regexp = "[A-Z]{3}\\d[A-Z\\d]\\d{2}|[A-Z]{3}\\d{4}",
        message = "Placa inválida. Use formato antigo (ABC1234) ou Mercosul (ABC1D23)"
    )
    private String placa;

    @NotNull(message = "Tipo de veículo é obrigatório")
    private TipoVeiculo tipo;

    @NotBlank @Size(max = 100) private String modelo;
    @NotBlank @Size(max = 100) private String marca;

    @NotNull @Min(1950) @Max(2030)
    private Integer ano;

    @NotBlank @Size(max = 60) private String cor;

    @NotNull @Min(1) @Max(8)
    private Integer capacidade;

    private Boolean temSeguro = false;
    private Boolean acessivel = false;
    private TipoCombustivel tipoCombustivel;

    // Carro
    @Min(2) @Max(6)
    private Integer qtdPortas;

    // Moto
    private String cilindrada;
    private Boolean temBauleto;
}
