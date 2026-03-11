package com.uniride.userservice.dto.request;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class CadastroMotoristaRequest {

    @NotBlank(message = "Nome é obrigatório")
    @Size(min = 3, max = 120, message = "Nome deve ter entre 3 e 120 caracteres")
    private String nome;

    @NotBlank(message = "E-mail é obrigatório")
    @Email(message = "E-mail inválido")
    @Size(max = 180)
    private String email;

    @NotBlank(message = "Senha é obrigatória")
    @Size(min = 8, message = "Senha deve ter ao menos 8 caracteres")
    @Pattern(
        regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&_\\-])[A-Za-z\\d@$!%*?&_\\-]{8,}$",
        message = "Senha deve conter maiúscula, minúscula, número e caractere especial"
    )
    private String senha;

    @NotBlank(message = "CPF é obrigatório")
    @Pattern(regexp = "\\d{3}\\.\\d{3}\\.\\d{3}-\\d{2}", message = "CPF inválido. Use: 000.000.000-00")
    private String cpf;

    @NotBlank(message = "CNH é obrigatória para motorista")
    @Size(min = 11, max = 11, message = "CNH deve ter exatamente 11 dígitos")
    @Pattern(regexp = "\\d{11}", message = "CNH deve conter apenas dígitos")
    private String cnh;

    private String miniBiografia;
    private Long instituicaoId;
}
