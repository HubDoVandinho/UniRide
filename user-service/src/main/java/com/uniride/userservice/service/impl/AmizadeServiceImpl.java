package com.uniride.userservice.service.impl;

import com.uniride.userservice.client.InstitutionClient;
import com.uniride.userservice.dto.response.AmizadeResponse;
import com.uniride.userservice.dto.response.PerfilPublicoResponse;
import com.uniride.userservice.dto.response.SaoAmigosResponse;
import com.uniride.userservice.entity.Amizade;
import com.uniride.userservice.entity.Participante;
import com.uniride.userservice.enums.StatusAmizade;
import com.uniride.userservice.exception.AcessoNegadoException;
import com.uniride.userservice.exception.BusinessException;
import com.uniride.userservice.exception.RecursoNaoEncontradoException;
import com.uniride.userservice.repository.AmizadeRepository;
import com.uniride.userservice.repository.ParticipantePreferenciaRepository;
import com.uniride.userservice.repository.ParticipanteRepository;
import com.uniride.userservice.service.AmizadeService;
import com.uniride.userservice.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class AmizadeServiceImpl implements AmizadeService {

    private final AmizadeRepository                  amizadeRepository;
    private final ParticipanteRepository             participanteRepository;
    private final ParticipantePreferenciaRepository  participantePreferenciaRepository;
    private final InstitutionClient                  institutionClient;
    private final NotificationService                notificationService;

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

        AmizadeResponse response = toResponse(amizadeRepository.save(amizade));

        // Notifica o destinatário
        String nomeExibicao = solicitante.getNomeSocial() != null && !solicitante.getNomeSocial().isBlank()
                ? solicitante.getNomeSocial() : solicitante.getNome();
        notificationService.enviar(
                destinatario.getPushToken(),
                "Nova solicitação de amizade",
                nomeExibicao + " quer ser seu amigo!",
                Map.of("tipo", "AMIZADE_PENDENTE", "amizadeId", response.getId())
        );

        return response;
    }

    // ── Aceitar ───────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public AmizadeResponse aceitar(Long amizadeId, Long destinatarioId) {
        Amizade amizade = buscarAmizadeComoDestinatario(amizadeId, destinatarioId);
        validarPendente(amizade);
        amizade.setStatus(StatusAmizade.ACEITA);
        AmizadeResponse response = toResponse(amizadeRepository.save(amizade));

        // Notifica o solicitante
        Participante solicitante = amizade.getSolicitante();
        Participante destinatario = amizade.getDestinatario();
        String nomeDestinatario = destinatario.getNomeSocial() != null && !destinatario.getNomeSocial().isBlank()
                ? destinatario.getNomeSocial() : destinatario.getNome();
        notificationService.enviar(
                solicitante.getPushToken(),
                "Solicitação aceita!",
                nomeDestinatario + " aceitou seu pedido de amizade.",
                Map.of("tipo", "AMIZADE_ACEITA", "amizadeId", amizadeId)
        );

        return response;
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

        boolean podeRemover = amizade.getStatus() == StatusAmizade.ACEITA
                || (amizade.getStatus() == StatusAmizade.PENDENTE
                    && amizade.getSolicitante().getId().equals(participanteId));

        if (!podeRemover) {
            throw new BusinessException("Só é possível remover amizades aceitas. Use recusar ou bloquear.");
        }

        amizadeRepository.delete(amizade);
        log.info("Amizade id={} removida pelo participante id={}", amizadeId, participanteId);
    }

    // ── Cancelar solicitação enviada ──────────────────────────────────────────

    @Override
    @Transactional
    public void cancelarSolicitacao(Long amizadeId, Long solicitanteId) {
        Amizade amizade = amizadeRepository.findById(amizadeId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Amizade"));

        if (!amizade.getSolicitante().getId().equals(solicitanteId)) {
            throw new BusinessException("Você não é o solicitante desta amizade.");
        }

        if (amizade.getStatus() != StatusAmizade.PENDENTE) {
            throw new BusinessException("Só é possível cancelar solicitações pendentes.");
        }

        amizadeRepository.delete(amizade);
        log.info("Solicitação id={} cancelada pelo solicitante id={}", amizadeId, solicitanteId);
    }

    // ── Listagens ─────────────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public List<AmizadeResponse> listarAmigos(Long participanteId) {
        return amizadeRepository.findAmigosAceitos(participanteId)
                .stream().map(this::toResponse).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<AmizadeResponse> listarPendentesRecebidas(Long participanteId) {
        return amizadeRepository
                .findByDestinatarioIdAndStatus(participanteId, StatusAmizade.PENDENTE)
                .stream().map(this::toResponse).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<AmizadeResponse> listarPendentesEnviadas(Long participanteId) {
        return amizadeRepository
                .findBySolicitanteIdAndStatus(participanteId, StatusAmizade.PENDENTE)
                .stream().map(this::toResponse).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<AmizadeResponse> listarTodasEnviadas(Long participanteId) {
        return amizadeRepository
                .findEnviadasNaoAceitas(participanteId)
                .stream().map(this::toResponse).toList();
    }

    // ── Busca por nome dentro da instituição ─────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public List<PerfilPublicoResponse> buscarNaInstituicao(Long meuId, String termo) {
        Participante eu = buscarParticipante(meuId);
        Long instituicaoId = eu.getInstituicaoId();

        if (instituicaoId == null || termo == null || termo.isBlank()) return List.of();

        String termoNormalizado = termo.trim().startsWith("@")
                ? termo.trim().substring(1)
                : termo.trim();

        return participanteRepository
                .buscarPorNomeNaInstituicao(meuId, instituicaoId, termoNormalizado)
                .stream()
                .map(p -> toPerfilPublicoComStatus(p, meuId, instituicaoId))
                .toList();
    }

    // ── Sugestões da instituição ──────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
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
    @Transactional(readOnly = true)
    public PerfilPublicoResponse buscarPerfilPublico(Long participanteId, Long meuId) {
        Participante participante = buscarParticipante(participanteId);
        PerfilPublicoResponse resp = meuId == null
                ? toPerfilPublico(participante, participante.getInstituicaoId())
                : toPerfilPublicoComStatus(participante, meuId, participante.getInstituicaoId());
        resp.setTotalAmigos((int) amizadeRepository.countAmigosAceitos(participanteId));
        return resp;
    }

    @Override
    @Transactional(readOnly = true)
    public PerfilPublicoResponse buscarPerfilPublicoPorUsername(String username, Long meuId) {
        Participante participante = participanteRepository.findByUsername(username.toLowerCase().trim())
                .orElseThrow(() -> new RecursoNaoEncontradoException("Participante"));
        PerfilPublicoResponse resp = meuId == null
                ? toPerfilPublico(participante, participante.getInstituicaoId())
                : toPerfilPublicoComStatus(participante, meuId, participante.getInstituicaoId());
        resp.setTotalAmigos((int) amizadeRepository.countAmigosAceitos(participante.getId()));
        return resp;
    }

    // ── Listar amigos de outro usuário (privado) ──────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public List<PerfilPublicoResponse> listarAmigosDeOutroUsuario(Long targetId, Long meuId) {
        if (!amizadeRepository.saoAmigos(meuId, targetId)) {
            throw new AcessoNegadoException();
        }
        return amizadeRepository.findAmigosAceitos(targetId)
                .stream()
                .map(a -> {
                    Participante outro = a.getSolicitante().getId().equals(targetId)
                            ? a.getDestinatario()
                            : a.getSolicitante();
                    return toPerfilPublicoComStatus(outro, meuId, outro.getInstituicaoId());
                })
                .toList();
    }

    // ── Verificar amizade (Feign Client do ride-service) ──────────────────────

    @Override
    @Transactional(readOnly = true)
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

        List<String> preferencias = participantePreferenciaRepository
                .findAllByParticipanteId(p.getId())
                .stream()
                .map(pp -> pp.getTipoPreferencia().getNome())
                .toList();

        return PerfilPublicoResponse.builder()
                .id(p.getId())
                .nome(nomeExibicao)
                .username(p.getUsername())
                .fotoPerfil(p.getFotoPerfilUrl())
                .instituicao(nomeInstituicao)
                .tipo(p.getClass().getSimpleName().toUpperCase())
                .avaliacaoMedia(p.getMediaAvaliacoes())
                .verificado(p.getVerificado())
                .miniBiografia(p.getMiniBiografia())
                .preferencias(preferencias.isEmpty() ? null : preferencias)
                .build();
    }

    private PerfilPublicoResponse toPerfilPublicoComStatus(Participante p, Long meuId, Long instituicaoId) {
        PerfilPublicoResponse base = toPerfilPublico(p, instituicaoId);

        amizadeRepository.findEntre(meuId, p.getId()).ifPresentOrElse(
            amizade -> {
                String status = switch (amizade.getStatus()) {
                    case ACEITA    -> "ACEITA";
                    case BLOQUEADA -> "BLOQUEADA";
                    case RECUSADA  -> "NENHUMA"; // permite reenviar
                    case PENDENTE  -> amizade.getSolicitante().getId().equals(meuId)
                                        ? "PENDENTE_ENVIADA"
                                        : "PENDENTE_RECEBIDA";
                };
                base.setStatusAmizade(status);
                base.setAmizadeId(amizade.getId());
            },
            () -> base.setStatusAmizade("NENHUMA")
        );

        return base;
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
