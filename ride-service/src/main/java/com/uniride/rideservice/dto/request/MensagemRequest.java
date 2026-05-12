package com.uniride.rideservice.dto.request;

import com.uniride.rideservice.enums.TipoMensagem;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class MensagemRequest {

    @NotNull(message = "O tipo da mensagem é obrigatório.")
    private TipoMensagem tipo;

    private String conteudo;

    private String imagemBase64;
}
