package com.uniride.userservice.dto.request;

import com.uniride.userservice.enums.TipoTelefone;
import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class TelefoneRequest {

    @NotBlank @Size(min = 2, max = 3) private String ddd;

    @NotBlank
    @Pattern(regexp = "\\d{8,9}", message = "Número inválido (8 ou 9 dígitos)")
    private String numero;

    @NotNull(message = "Tipo de telefone é obrigatório")
    private TipoTelefone tipo;

    private Boolean principal = false;
}
