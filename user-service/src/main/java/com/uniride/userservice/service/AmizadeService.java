package com.uniride.userservice.service;

import com.uniride.userservice.dto.response.AmizadeResponse;
import com.uniride.userservice.dto.response.PerfilPublicoResponse;
import com.uniride.userservice.dto.response.SaoAmigosResponse;

import java.util.List;

public interface AmizadeService {

    // Enviar solicitação de amizade
    AmizadeResponse enviarSolicitacao(Long solicitanteId, Long destinatarioId);

    // Responder solicitação
    AmizadeResponse aceitar(Long amizadeId, Long destinatarioId);
    AmizadeResponse recusar(Long amizadeId, Long destinatarioId);
    AmizadeResponse bloquear(Long amizadeId, Long destinatarioId);

    // Desfazer amizade aceita
    void remover(Long amizadeId, Long participanteId);

    // Listagens
    List<AmizadeResponse> listarAmigos(Long participanteId);
    List<AmizadeResponse> listarPendentesRecebidas(Long participanteId);
    List<AmizadeResponse> listarPendentesEnviadas(Long participanteId);

    // Sugestões de amigos da mesma instituição
    List<PerfilPublicoResponse> sugestoesDaInstituicao(Long participanteId);

    // Perfil público de qualquer participante
    PerfilPublicoResponse buscarPerfilPublico(Long participanteId);

    // Endpoint para o Feign Client do ride-service
    SaoAmigosResponse verificarAmizade(Long idA, Long idB);
}
