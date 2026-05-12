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
    private String username;
    private String emailPessoal;
    private String emailInstitucional;
    private String cpf;
    private String miniBiografia;
    private String fotoPerfilUrl;
    private Boolean verificado;
    private StatusParticipante status;
    private LocalDateTime criadoEm;
    private InstituicaoResponse instituicao;
    private List<EnderecoResponse> enderecos;
    private List<TelefoneResponse> telefones;
    private Double mediaAvaliacoes;
    private List<TipoPreferenciaResponse> preferencias;

    // Motorista
    private String cnh;
    private LocalDate validadeCnh;
    private Boolean aprovadoAdmin;
    private VeiculoResponse veiculo;       // primeiro veículo (compat)
    private List<VeiculoResponse> veiculos; // todos os veículos

    // Passageiro
    private String necessidadesEspeciais;
}
