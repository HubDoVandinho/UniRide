package com.uniride.userservice.dto.request;

import com.uniride.userservice.enums.StatusDenuncia;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class RevisarDenunciaRequest {

    @NotNull(message = "O status é obrigatório.")
    private StatusDenuncia status;

    @Size(max = 500, message = "A nota deve ter no máximo 500 caracteres.")
    private String notaAdmin;
}
