package com.uniride.userservice.dto.request;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class EnderecoRequest {

    @NotBlank @Size(max = 200) private String rua;
    @Size(max = 20) private String numero;
    @NotBlank @Size(max = 100) private String bairro;

    @NotBlank
    @Pattern(regexp = "\\d{8}", message = "CEP deve ter 8 dígitos (somente números)")
    private String cep;

    @NotBlank @Size(max = 100) private String cidade;

    @NotBlank @Size(min = 2, max = 2, message = "Estado deve ser a UF com 2 letras")
    private String estado;
}
