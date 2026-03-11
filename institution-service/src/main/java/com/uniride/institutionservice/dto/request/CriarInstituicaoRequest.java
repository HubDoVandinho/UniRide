package com.uniride.institutionservice.dto.request;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class CriarInstituicaoRequest {

    @NotBlank(message = "Nome é obrigatório")
    @Size(max = 200, message = "Nome deve ter no máximo 200 caracteres")
    private String nome;

    @Size(max = 20, message = "Sigla deve ter no máximo 20 caracteres")
    private String sigla;

    @NotBlank(message = "Domínio de e-mail é obrigatório")
    @Size(max = 100, message = "Domínio deve ter no máximo 100 caracteres")
    @Pattern(regexp = "^[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
             message = "Domínio inválido. Ex: fatec.edu.br")
    private String dominioEmail;

    @Size(max = 50, message = "Tipo deve ter no máximo 50 caracteres")
    private String tipo;

    private String rua;
    private String numero;
    private String bairro;

    @NotBlank(message = "Cidade é obrigatória")
    @Size(max = 100, message = "Cidade deve ter no máximo 100 caracteres")
    private String cidade;

    @NotBlank(message = "Estado é obrigatório")
    @Size(min = 2, max = 2, message = "Estado deve ter 2 caracteres")
    private String estado;

    @Pattern(regexp = "^[0-9]{8}$", message = "CEP inválido")
    private String cep;
}
