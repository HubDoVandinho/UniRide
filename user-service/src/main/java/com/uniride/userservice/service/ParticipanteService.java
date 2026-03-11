package com.uniride.userservice.service;

import com.uniride.userservice.dto.request.*;
import com.uniride.userservice.dto.response.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface ParticipanteService {
    ParticipanteResponse cadastrarMotorista(CadastroMotoristaRequest request);
    ParticipanteResponse cadastrarPassageiro(CadastroPassageiroRequest request);
    ParticipanteResponse buscarPorId(Long id);
    ParticipanteResponse atualizarPerfil(Long id, AtualizarPerfilRequest request);
    void desativarConta(Long id);
    Page<ParticipanteResponse> listarTodos(Pageable pageable);

    // Veículo
    ParticipanteResponse cadastrarVeiculo(Long motoristaId, CadastroVeiculoRequest request);
    VeiculoResponse buscarVeiculo(Long motoristaId);

    // Endereço
    EnderecoResponse adicionarEndereco(Long participanteId, EnderecoRequest request);
    List<EnderecoResponse> listarEnderecos(Long participanteId);
    void removerEndereco(Long participanteId, Long enderecoId);

    // Telefone
    TelefoneResponse adicionarTelefone(Long participanteId, TelefoneRequest request);
    List<TelefoneResponse> listarTelefones(Long participanteId);
    void removerTelefone(Long participanteId, Long telefoneId);
}
