package com.uniride.userservice.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RedefinirSenhaRequest {

    @NotBlank(message = "Código é obrigatório")
    @Size(min = 6, max = 6, message = "Código inválido")
    private String codigo;

    @NotBlank(message = "Nova senha é obrigatória")
    @Size(min = 6, message = "A senha deve ter no mínimo 6 caracteres")
    private String novaSenha;
}
