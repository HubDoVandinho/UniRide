package com.uniride.userservice.dto.response;

import com.uniride.userservice.enums.StatusParticipante;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data @Builder
public class ParticipanteResponse {
    private Long id;
    private String tipo; // MOTORISTA ou PASSAGEIRO
    private String nome;
    private String email;
    private String cpf;
    private String miniBiografia;
    private Boolean verificado;
    private StatusParticipante status;
    private LocalDateTime criadoEm;
    private InstituicaoResponse instituicao;
    private List<EnderecoResponse> enderecos;
    private List<TelefoneResponse> telefones;

    // Motorista
    private String cnh;
    private LocalDate validadeCnh;
    private Boolean aprovadoAdmin;
    private VeiculoResponse veiculo;

    // Passageiro
    private String necessidadesEspeciais;
}
