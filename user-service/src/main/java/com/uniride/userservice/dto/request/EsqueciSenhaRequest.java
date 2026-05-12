package com.uniride.userservice.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class EsqueciSenhaRequest {

    @NotBlank(message = "E-mail é obrigatório")
    @Email(message = "Informe um e-mail válido")
    private String email;
}
