package com.uniride.userservice.service.impl;

import com.uniride.userservice.dto.request.CriarDenunciaRequest;
import com.uniride.userservice.dto.request.RevisarDenunciaRequest;
import com.uniride.userservice.dto.response.BloqueioResponse;
import com.uniride.userservice.dto.response.DenunciaResponse;
import com.uniride.userservice.entity.Bloqueio;
import com.uniride.userservice.entity.Denuncia;
import com.uniride.userservice.entity.Participante;
import com.uniride.userservice.enums.StatusDenuncia;
import com.uniride.userservice.enums.StatusParticipante;
import com.uniride.userservice.exception.BusinessException;
import com.uniride.userservice.exception.RecursoNaoEncontradoException;
import com.uniride.userservice.repository.BloqueioRepository;
import com.uniride.userservice.repository.DenunciaRepository;
import com.uniride.userservice.repository.ParticipanteRepository;
import com.uniride.userservice.service.DenunciaService;
import com.uniride.userservice.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class DenunciaServiceImpl implements DenunciaService {

    private static final int LIMIAR_SUSPENSAO = 3;

    private final DenunciaRepository denunciaRepository;
    private final BloqueioRepository bloqueioRepository;
    private final ParticipanteRepository participanteRepository;
    private final NotificationService notificationService;

    @Override
    @Transactional
    public DenunciaResponse criar(Long denuncianteId, CriarDenunciaRequest req) {
        if (denuncianteId.equals(req.getDenunciadoId())) {
            throw new BusinessException("Você não pode se denunciar.");
        }

        // evita duplicidade por carona ou por par sem carona
        boolean jaExiste = req.getCaronaId() != null
            ? denunciaRepository.existsByDenuncianteIdAndDenunciadoIdAndCaronaId(denuncianteId, req.getDenunciadoId(), req.getCaronaId())
            : denunciaRepository.existsByDenuncianteIdAndDenunciadoIdAndCaronaIdIsNull(denuncianteId, req.getDenunciadoId());

        if (jaExiste) {
            throw new BusinessException("Você já enviou uma denúncia para este usuário neste contexto.");
        }

        Denuncia denuncia = new Denuncia();
        denuncia.setDenuncianteId(denuncianteId);
        denuncia.setDenunciadoId(req.getDenunciadoId());
        denuncia.setCaronaId(req.getCaronaId());
        denuncia.setMotivo(req.getMotivo());
        denuncia.setDescricao(req.getDescricao());
        denuncia.setStatus(StatusDenuncia.PENDENTE);

        Denuncia salva = denunciaRepository.save(denuncia);
        log.info("Denúncia criada: id={}, denunciante={}, denunciado={}", salva.getId(), denuncianteId, req.getDenunciadoId());

        // Suspensão automática após atingir o limiar (conta apenas PENDENTE)
        long total = denunciaRepository.countByDenunciadoIdAndStatus(req.getDenunciadoId(), StatusDenuncia.PENDENTE);
        if (total >= LIMIAR_SUSPENSAO) {
            participanteRepository.findById(req.getDenunciadoId()).ifPresent(p -> {
                if (p.getStatus() == StatusParticipante.ATIVO) {
                    p.setStatus(StatusParticipante.SUSPENSO);
                    participanteRepository.save(p);
                    notificarSuspensao(p);
                    log.warn("Participante id={} suspenso automaticamente após {} denúncias.", p.getId(), total);
                }
            });
        }

        return toResponse(salva);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<DenunciaResponse> listarPorStatus(StatusDenuncia status, Pageable pageable) {
        return denunciaRepository.findAllByStatus(status, pageable).map(this::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<DenunciaResponse> listarPorDenunciado(Long denunciadoId, Pageable pageable) {
        return denunciaRepository.findAllByDenunciadoId(denunciadoId, pageable).map(this::toResponse);
    }

    @Override
    @Transactional
    public DenunciaResponse revisar(Long denunciaId, RevisarDenunciaRequest req) {
        Denuncia denuncia = denunciaRepository.findById(denunciaId)
            .orElseThrow(() -> new RecursoNaoEncontradoException("Denúncia"));

        StatusDenuncia statusAnterior = denuncia.getStatus();
        denuncia.setStatus(req.getStatus());
        denuncia.setNotaAdmin(req.getNotaAdmin());
        denuncia.setRevisadoEm(LocalDateTime.now());

        if (req.getStatus() == StatusDenuncia.SUSPENSAO_APLICADA) {
            participanteRepository.findById(denuncia.getDenunciadoId()).ifPresent(p -> {
                p.setStatus(StatusParticipante.SUSPENSO);
                participanteRepository.save(p);
                notificarSuspensao(p);
                log.info("Suspensão manual aplicada pelo admin: participanteId={}", p.getId());
            });
        } else if (req.getStatus() == StatusDenuncia.ARQUIVADA
                && statusAnterior == StatusDenuncia.SUSPENSAO_APLICADA) {
            // Esta denúncia estava com suspensão aplicada — verificar se há outras antes de revogar
            long aplicadas = denunciaRepository.countByDenunciadoIdAndStatus(
                    denuncia.getDenunciadoId(), StatusDenuncia.SUSPENSAO_APLICADA);
            // aplicadas ainda inclui esta (não foi salva) → == 1 significa que era a única
            if (aplicadas <= 1) {
                participanteRepository.findById(denuncia.getDenunciadoId()).ifPresent(p -> {
                    if (p.getStatus() == StatusParticipante.SUSPENSO) {
                        p.setStatus(StatusParticipante.ATIVO);
                        participanteRepository.save(p);
                        log.info("Suspensão revertida ao arquivar denúncia: participanteId={}", p.getId());
                    }
                });
            }
        }

        return toResponse(denunciaRepository.save(denuncia));
    }

    @Override
    @Transactional
    public void bloquear(Long bloqueadorId, Long bloqueadoId) {
        if (bloqueadorId.equals(bloqueadoId)) {
            throw new BusinessException("Você não pode se bloquear.");
        }
        if (!bloqueioRepository.existsByBloqueadorIdAndBloqueadoId(bloqueadorId, bloqueadoId)) {
            Bloqueio bloqueio = new Bloqueio();
            bloqueio.setBloqueadorId(bloqueadorId);
            bloqueio.setBloqueadoId(bloqueadoId);
            bloqueioRepository.save(bloqueio);
            log.info("Bloqueio criado: {} bloqueou {}", bloqueadorId, bloqueadoId);
        }
    }

    @Override
    @Transactional
    public void desbloquear(Long bloqueadorId, Long bloqueadoId) {
        bloqueioRepository.findByBloqueadorIdAndBloqueadoId(bloqueadorId, bloqueadoId)
            .ifPresent(bloqueioRepository::delete);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean estaBloqueado(Long bloqueadorId, Long bloqueadoId) {
        return bloqueioRepository.existsByBloqueadorIdAndBloqueadoId(bloqueadorId, bloqueadoId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<BloqueioResponse> listarBloqueios(Long bloqueadorId) {
        return bloqueioRepository.findAllByBloqueadorId(bloqueadorId).stream()
            .map(b -> {
                var p = participanteRepository.findById(b.getBloqueadoId()).orElse(null);
                return BloqueioResponse.builder()
                        .id(b.getId())
                        .bloqueadoId(b.getBloqueadoId())
                        .nomeBloqueado(p != null ? p.getNome() : null)
                        .fotoBloqueado(p != null ? p.getFotoPerfilUrl() : null)
                        .criadoEm(b.getCriadoEm())
                        .build();
            }).toList();
    }

    private void notificarSuspensao(Participante p) {
        if (p.getPushToken() == null || p.getPushToken().isBlank()) return;
        notificationService.enviar(
            p.getPushToken(),
            "Conta suspensa",
            "Sua conta foi suspensa. Se acredita que foi um engano, entre em contato: suporte@uniride.com",
            Map.of("tipo", "CONTA_SUSPENSA")
        );
    }

    private DenunciaResponse toResponse(Denuncia d) {
        String nomeDenunciante = participanteRepository.findById(d.getDenuncianteId())
                .map(p -> p.getNome()).orElse(null);
        String nomeDenunciado = participanteRepository.findById(d.getDenunciadoId())
                .map(p -> p.getNome()).orElse(null);
        return DenunciaResponse.builder()
            .id(d.getId())
            .denuncianteId(d.getDenuncianteId())
            .nomeDenunciante(nomeDenunciante)
            .denunciadoId(d.getDenunciadoId())
            .nomeDenunciado(nomeDenunciado)
            .caronaId(d.getCaronaId())
            .motivo(d.getMotivo())
            .descricao(d.getDescricao())
            .status(d.getStatus())
            .notaAdmin(d.getNotaAdmin())
            .criadoEm(d.getCriadoEm())
            .revisadoEm(d.getRevisadoEm())
            .build();
    }
}
