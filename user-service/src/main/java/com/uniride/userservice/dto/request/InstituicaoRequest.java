package com.uniride.userservice.dto.request;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class InstituicaoRequest {

    @NotBlank @Size(max = 200) private String nome;
    @Size(max = 200) private String rua;
    @Size(max = 20) private String numero;
    @Size(max = 100) private String bairro;
    @Pattern(regexp = "\\d{8}", message = "CEP deve ter 8 dígitos") private String cep;
    @Size(min = 2, max = 2) private String estado;
}
