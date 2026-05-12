package com.uniride.userservice.service;

import com.uniride.userservice.dto.request.*;
import com.uniride.userservice.dto.response.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface ParticipanteService {
    ParticipanteResponse cadastrarMotorista(CadastroMotoristaRequest request);
    ParticipanteResponse cadastrarPassageiro(CadastroPassageiroRequest request);
    boolean usernameDisponivel(String username);
    ParticipanteResponse buscarPorId(Long id);
    ParticipanteResponse atualizarPerfil(Long id, AtualizarPerfilRequest request);
    void desativarConta(Long id);
    void apagarConta(Long id, String senha);
    Page<ParticipanteResponse> listarTodos(Pageable pageable);

    // Veículo
    ParticipanteResponse cadastrarVeiculo(Long motoristaId, CadastroVeiculoRequest request);
    ParticipanteResponse atualizarVeiculo(Long motoristaId, Long veiculoId, CadastroVeiculoRequest request);
    List<VeiculoResponse> listarVeiculos(Long motoristaId);
    VeiculoResponse buscarVeiculo(Long motoristaId);
    void removerVeiculo(Long motoristaId, Long veiculoId);

    // Endereço
    EnderecoResponse adicionarEndereco(Long participanteId, EnderecoRequest request);
    List<EnderecoResponse> listarEnderecos(Long participanteId);
    void removerEndereco(Long participanteId, Long enderecoId);

    // Avaliação
    void atualizarMediaAvaliacoes(Long id, Double media);

    // Foto de perfil
    ParticipanteResponse atualizarFotoPerfil(Long id, String url);

    // Verificação de matrícula
    void verificarParticipante(Long id);
    void desverificarParticipante(Long id);

    // Ativação manual (ADMIN) — substitui o fluxo de token de confirmação em testes
    void ativarConta(Long id);

    // Telefone
    TelefoneResponse adicionarTelefone(Long participanteId, TelefoneRequest request);
    List<TelefoneResponse> listarTelefones(Long participanteId);
    void removerTelefone(Long participanteId, Long telefoneId);

    // Preferências
    List<TipoPreferenciaResponse> listarPreferencias(Long participanteId);
    void atualizarPreferencias(Long participanteId, List<Long> tipoIds);
    TipoPreferenciaResponse criarPreferenciaCustom(Long participanteId, String nome);
    void deletarPreferenciaCustom(Long participanteId, Long tipoId);

    // Push notifications
    void salvarPushToken(Long participanteId, String pushToken);
    String buscarPushToken(Long participanteId);

    // Moderação
    void suspenderConta(Long id);
    void dessuspenderConta(Long id);
    boolean cpfJaSuspenso(String cpf);

    // Aprovação de motorista
    Page<ParticipanteResponse> listarMotoristasNaoAprovados(Pageable pageable);
    void aprovarMotorista(Long id);
    void rejeitarMotorista(Long id, String motivo);
}
