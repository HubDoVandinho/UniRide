package com.uniride.institutionservice.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ImportarEmecRequest {

    @NotBlank(message = "Código e-MEC é obrigatório")
    private String codigoEmec;
}
