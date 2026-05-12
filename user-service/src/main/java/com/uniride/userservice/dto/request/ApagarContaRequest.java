package com.uniride.userservice.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ApagarContaRequest {

    @NotBlank(message = "Senha é obrigatória para confirmar a exclusão da conta")
    private String senha;
}
