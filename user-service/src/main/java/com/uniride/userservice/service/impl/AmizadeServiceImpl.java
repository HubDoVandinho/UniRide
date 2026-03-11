package com.uniride.userservice.service.impl;

import com.uniride.userservice.client.InstitutionClient;
import com.uniride.userservice.dto.response.AmizadeResponse;
import com.uniride.userservice.dto.response.PerfilPublicoResponse;
import com.uniride.userservice.dto.response.SaoAmigosResponse;
import com.uniride.userservice.entity.Amizade;
import com.uniride.userservice.entity.Participante;
import com.uniride.userservice.enums.StatusAmizade;
import com.uniride.userservice.exception.BusinessException;
import com.uniride.userservice.exception.RecursoNaoEncontradoException;
import com.uniride.userservice.repository.AmizadeRepository;
import com.uniride.userservice.repository.ParticipanteRepository;
import com.uniride.userservice.service.AmizadeService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class AmizadeServiceImpl implements AmizadeService {

    private final AmizadeRepository     amizadeRepository;
    private final ParticipanteRepository participanteRepository;
    private final InstitutionClient     institutionClient;

    // ── Enviar solicitação ────────────────────────────────────────────────────

    @Override
    @Transactional
    public AmizadeResponse enviarSolicitacao(Long solicitanteId, Long destinatarioId) {

        if (solicitanteId.equals(destinatarioId)) {
            throw new BusinessException("Você não pode enviar solicitação para si mesmo.");
        }

        Participante solicitante = buscarParticipante(solicitanteId);
        Participante destinatario = buscarParticipante(destinatarioId);

        // Verifica se já existe algum vínculo
        amizadeRepository.findEntre(solicitanteId, destinatarioId).ifPresent(a -> {
            switch (a.getStatus()) {
                case PENDENTE  -> throw new BusinessException("Já existe uma solicitação pendente entre vocês.");
                case ACEITA    -> throw new BusinessException("Vocês já são amigos.");
                case BLOQUEADA -> throw new BusinessException("Não é possível enviar solicitação para este usuário.");
                case RECUSADA  -> {
                    // Permite reenviar após recusa — deleta o registro anterior
                    amizadeRepository.delete(a);
                    amizadeRepository.flush();
                }
            }
        });

        Amizade amizade = new Amizade();
        amizade.setSolicitante(solicitante);
        amizade.setDestinatario(destinatario);
        amizade.setStatus(StatusAmizade.PENDENTE);

        return toResponse(amizadeRepository.save(amizade));
    }

    // ── Aceitar ───────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public AmizadeResponse aceitar(Long amizadeId, Long destinatarioId) {
        Amizade amizade = buscarAmizadeComoDestinatario(amizadeId, destinatarioId);
        validarPendente(amizade);
        amizade.setStatus(StatusAmizade.ACEITA);
        return toResponse(amizadeRepository.save(amizade));
    }

    // ── Recusar ───────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public AmizadeResponse recusar(Long amizadeId, Long destinatarioId) {
        Amizade amizade = buscarAmizadeComoDestinatario(amizadeId, destinatarioId);
        validarPendente(amizade);
        amizade.setStatus(StatusAmizade.RECUSADA);
        return toResponse(amizadeRepository.save(amizade));
    }

    // ── Bloquear ──────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public AmizadeResponse bloquear(Long amizadeId, Long destinatarioId) {
        Amizade amizade = buscarAmizadeComoDestinatario(amizadeId, destinatarioId);
        amizade.setStatus(StatusAmizade.BLOQUEADA);
        return toResponse(amizadeRepository.save(amizade));
    }

    // ── Remover amizade ───────────────────────────────────────────────────────

    @Override
    @Transactional
    public void remover(Long amizadeId, Long participanteId) {
        Amizade amizade = amizadeRepository.findById(amizadeId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Amizade"));

        boolean envolvido = amizade.getSolicitante().getId().equals(participanteId)
                || amizade.getDestinatario().getId().equals(participanteId);

        if (!envolvido) {
            throw new BusinessException("Você não faz parte desta amizade.");
        }

        if (amizade.getStatus() != StatusAmizade.ACEITA) {
            throw new BusinessException("Só é possível remover amizades aceitas. Use recusar ou bloquear.");
        }

        amizadeRepository.delete(amizade);
        log.info("Amizade id={} removida pelo participante id={}", amizadeId, participanteId);
    }

    // ── Listagens ─────────────────────────────────────────────────────────────

    @Override
    public List<AmizadeResponse> listarAmigos(Long participanteId) {
        return amizadeRepository.findAmigosAceitos(participanteId)
                .stream().map(this::toResponse).toList();
    }

    @Override
    public List<AmizadeResponse> listarPendentesRecebidas(Long participanteId) {
        return amizadeRepository
                .findByDestinatarioIdAndStatus(participanteId, StatusAmizade.PENDENTE)
                .stream().map(this::toResponse).toList();
    }

    @Override
    public List<AmizadeResponse> listarPendentesEnviadas(Long participanteId) {
        return amizadeRepository
                .findBySolicitanteIdAndStatus(participanteId, StatusAmizade.PENDENTE)
                .stream().map(this::toResponse).toList();
    }

    // ── Sugestões da instituição ──────────────────────────────────────────────

    @Override
    public List<PerfilPublicoResponse> sugestoesDaInstituicao(Long participanteId) {
        Participante participante = buscarParticipante(participanteId);
        Long instituicaoId = participante.getInstituicaoId();

        if (instituicaoId == null) return List.of();

        List<Long> ids = amizadeRepository.findSugestoesDaInstituicao(participanteId, instituicaoId);

        return ids.stream()
                .map(id -> participanteRepository.findById(id).orElse(null))
                .filter(p -> p != null)
                .map(p -> toPerfilPublico(p, instituicaoId))
                .toList();
    }

    // ── Perfil público ────────────────────────────────────────────────────────

    @Override
    public PerfilPublicoResponse buscarPerfilPublico(Long participanteId) {
        Participante participante = buscarParticipante(participanteId);
        return toPerfilPublico(participante, participante.getInstituicaoId());
    }

    // ── Verificar amizade (Feign Client do ride-service) ──────────────────────

    @Override
    public SaoAmigosResponse verificarAmizade(Long idA, Long idB) {
        return SaoAmigosResponse.builder()
                .idA(idA)
                .idB(idB)
                .amigos(amizadeRepository.saoAmigos(idA, idB))
                .build();
    }

    // ── Helpers privados ──────────────────────────────────────────────────────

    private Participante buscarParticipante(Long id) {
        return participanteRepository.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Participante"));
    }

    private Amizade buscarAmizadeComoDestinatario(Long amizadeId, Long destinatarioId) {
        Amizade amizade = amizadeRepository.findById(amizadeId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Amizade"));
        if (!amizade.getDestinatario().getId().equals(destinatarioId)) {
            throw new BusinessException("Você não é o destinatário desta solicitação.");
        }
        return amizade;
    }

    private void validarPendente(Amizade amizade) {
        if (amizade.getStatus() != StatusAmizade.PENDENTE) {
            throw new BusinessException("Esta solicitação não está mais pendente.");
        }
    }

    private PerfilPublicoResponse toPerfilPublico(Participante p, Long instituicaoId) {
        String nomeExibicao = p.getNomeSocial() != null && !p.getNomeSocial().isBlank()
                ? p.getNomeSocial()
                : p.getNome();

        String nomeInstituicao = null;
        if (instituicaoId != null) {
            try {
                var inst = institutionClient.buscarPorId(instituicaoId);
                if (inst != null && inst.getDados() != null) {
                    nomeInstituicao = inst.getDados().getNome();
                }
            } catch (Exception e) {
                log.warn("institution-service indisponível ao montar perfil público id={}", p.getId());
            }
        }

        return PerfilPublicoResponse.builder()
                .id(p.getId())
                .nome(nomeExibicao)
                .fotoPerfil(null) // implementar upload futuramente
                .instituicao(nomeInstituicao)
                .tipo(p.getClass().getSimpleName().toUpperCase())
                .avaliacaoMedia(null) // virá do ride-service futuramente
                .verificado(p.getVerificado())
                .build();
    }

    private AmizadeResponse toResponse(Amizade a) {
        return AmizadeResponse.builder()
                .id(a.getId())
                .status(a.getStatus())
                .criadoEm(a.getCriadoEm())
                .atualizadoEm(a.getAtualizadoEm())
                .solicitante(toPerfilPublico(a.getSolicitante(), a.getSolicitante().getInstituicaoId()))
                .destinatario(toPerfilPublico(a.getDestinatario(), a.getDestinatario().getInstituicaoId()))
                .build();
    }
}
