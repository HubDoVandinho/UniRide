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

    // Cancelar solicitação pendente enviada pelo próprio usuário
    void cancelarSolicitacao(Long amizadeId, Long solicitanteId);

    // Listagens
    List<AmizadeResponse> listarAmigos(Long participanteId);
    List<AmizadeResponse> listarPendentesRecebidas(Long participanteId);
    List<AmizadeResponse> listarPendentesEnviadas(Long participanteId);
    List<AmizadeResponse> listarTodasEnviadas(Long participanteId);

    // Sugestões de amigos da mesma instituição
    List<PerfilPublicoResponse> sugestoesDaInstituicao(Long participanteId);

    // Busca por nome dentro da própria instituição (com statusAmizade embutido)
    List<PerfilPublicoResponse> buscarNaInstituicao(Long meuId, String termo);

    // Perfil público de qualquer participante (com statusAmizade embutido)
    PerfilPublicoResponse buscarPerfilPublico(Long participanteId, Long meuId);
    PerfilPublicoResponse buscarPerfilPublicoPorUsername(String username, Long meuId);

    // Lista amigos de outro usuário — retorna 403 se o requester não for amigo do target
    List<PerfilPublicoResponse> listarAmigosDeOutroUsuario(Long targetId, Long meuId);

    // Endpoint para o Feign Client do ride-service
    SaoAmigosResponse verificarAmizade(Long idA, Long idB);
}
