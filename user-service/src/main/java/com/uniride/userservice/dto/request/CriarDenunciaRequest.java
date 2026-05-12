package com.uniride.userservice.dto.request;

import com.uniride.userservice.enums.MotivoDenuncia;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class CriarDenunciaRequest {

    @NotNull(message = "O ID do denunciado é obrigatório.")
    private Long denunciadoId;

    private Long caronaId;

    @NotNull(message = "O motivo é obrigatório.")
    private MotivoDenuncia motivo;

    @Size(max = 1000, message = "A descrição deve ter no máximo 1000 caracteres.")
    private String descricao;
}
