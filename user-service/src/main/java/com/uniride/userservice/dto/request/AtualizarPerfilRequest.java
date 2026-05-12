package com.uniride.userservice.dto.request;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class AtualizarPerfilRequest {

    @Size(min = 3, max = 120)
    private String nome;

    @Size(min = 3, max = 30, message = "Username deve ter entre 3 e 30 caracteres")
    @Pattern(regexp = "^[a-z][a-z0-9._]{2,29}$", message = "Username deve conter apenas letras minúsculas, números, pontos e underscores")
    private String username;

    @Size(max = 500)
    private String miniBiografia;

    private Long instituicaoId;

    /** yyyy-MM-dd — só aplicado se o participante for Motorista */
    private String validadeCnh;

    /** Base64 data URL da foto de perfil (ex: data:image/jpeg;base64,...) */
    private String fotoPerfilUrl;
}
