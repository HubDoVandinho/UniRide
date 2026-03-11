package com.uniride.userservice.dto.request;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class CadastroPassageiroRequest {

    @NotBlank(message = "Nome é obrigatório")
    @Size(min = 3, max = 120)
    private String nome;

    @NotBlank @Email(message = "E-mail inválido") @Size(max = 180)
    private String email;

    @NotBlank
    @Size(min = 8)
    @Pattern(
        regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&_\\-])[A-Za-z\\d@$!%*?&_\\-]{8,}$",
        message = "Senha deve conter maiúscula, minúscula, número e caractere especial"
    )
    private String senha;

    @NotBlank @Pattern(regexp = "\\d{3}\\.\\d{3}\\.\\d{3}-\\d{2}", message = "CPF inválido. Use: 000.000.000-00")
    private String cpf;

    private String necessidadesEspeciais;
    private String miniBiografia;
    private Long instituicaoId;
}
