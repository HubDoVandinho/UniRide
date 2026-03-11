package com.uniride.userservice.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class PromoverMotoristaRequest {

    @NotBlank(message = "CNH é obrigatória")
    private String cnh;

    private String validadeCnh; // yyyy-MM-dd, opcional

    private String miniBiografia;

    @NotNull(message = "Dados do veículo são obrigatórios")
    @Valid
    private CadastroVeiculoRequest veiculo;
}