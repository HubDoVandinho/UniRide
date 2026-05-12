package com.uniride.userservice.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class CadastroPassageiroRequest {

    @NotBlank(message = "Nome é obrigatório")
    @Size(min = 3, max = 120)
    private String nome;

    @Size(min = 3, max = 30, message = "Username deve ter entre 3 e 30 caracteres")
    @Pattern(regexp = "^[a-z][a-z0-9._]{2,29}$", message = "Username deve conter apenas letras minúsculas, números, pontos e underscores")
    private String username; // opcional — gerado automaticamente se não informado

    @NotBlank(message = "E-mail pessoal é obrigatório")
    @Email(message = "E-mail pessoal inválido")
    @Size(max = 180)
    private String emailPessoal;

    @NotBlank(message = "E-mail institucional é obrigatório")
    @Email(message = "E-mail institucional inválido")
    @Size(max = 180)
    private String emailInstitucional;

    @NotBlank
    @Size(min = 8)
    @Pattern(
        regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&_\\-])[A-Za-z\\d@$!%*?&_\\-]{8,}$",
        message = "Senha deve conter maiúscula, minúscula, número e caractere especial"
    )
    private String senha;

    @NotBlank @Pattern(regexp = "\\d{3}\\.\\d{3}\\.\\d{3}-\\d{2}", message = "CPF inválido. Use: 000.000.000-00")
    private String cpf;

    @NotNull(message = "Instituição é obrigatória")
    private Long instituicaoId;

    private String necessidadesEspeciais;

    @Size(max = 300, message = "Bio deve ter no máximo 300 caracteres")
    private String miniBiografia; // opcional — preenchido no onboarding

    @NotNull(message = "Endereço é obrigatório")
    @Valid
    private EnderecoRequest endereco;
}
