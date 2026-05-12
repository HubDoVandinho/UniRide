package com.uniride.userservice.dto.request;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class LoginRequest {

    // Credencial de login: e-mail pessoal ou @username
    @JsonProperty("login")
    @NotBlank(message = "E-mail ou username é obrigatório")
    private String login;

    @NotBlank(message = "Senha é obrigatória")
    private String senha;
}
