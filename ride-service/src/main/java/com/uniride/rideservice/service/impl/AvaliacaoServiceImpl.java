package com.uniride.rideservice.service.impl;

import com.uniride.rideservice.client.UserServiceClient;
import com.uniride.rideservice.dto.request.AvaliacaoRequest;
import com.uniride.rideservice.dto.response.AvaliacaoResponse;
import com.uniride.rideservice.entity.Avaliacao;
import com.uniride.rideservice.entity.Carona;
import com.uniride.rideservice.enums.StatusSolicitacao;
import com.uniride.rideservice.exception.BusinessException;
import com.uniride.rideservice.exception.RecursoNaoEncontradoException;
import com.uniride.rideservice.repository.AvaliacaoRepository;
import com.uniride.rideservice.repository.CaronaRepository;
import com.uniride.rideservice.repository.SolicitacaoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class AvaliacaoServiceImpl {

    private final AvaliacaoRepository avaliacaoRepository;
    private final CaronaRepository caronaRepository;
    private final SolicitacaoRepository solicitacaoRepository;
    private final UserServiceClient userServiceClient;

    @Transactional
    public AvaliacaoResponse avaliar(AvaliacaoRequest req, Long avaliadorId) {
        if (avaliadorId.equals(req.getAvaliadoId()))
            throw new BusinessException("Você não pode se autoavaliar.");

        Carona carona = caronaRepository.findById(req.getCaronaId())
                .orElseThrow(() -> new RecursoNaoEncontradoException("Carona"));

        if (carona.getStatus() != com.uniride.rideservice.enums.StatusCarona.CONCLUIDA)
            throw new BusinessException("Avaliações só podem ser feitas após a carona ser concluída.");

        // Verifica se o avaliador participou da carona (usa findMaisRecente para tolerar rows duplicadas legadas)
        boolean avaliadorParticipou = carona.getMotoristaId().equals(avaliadorId)
                || solicitacaoRepository.findMaisRecenteByCaronaIdAndPassageiroId(req.getCaronaId(), avaliadorId)
                        .map(s -> s.getStatus() == StatusSolicitacao.CONCLUIDA).orElse(false);

        if (!avaliadorParticipou)
            throw new BusinessException("Você não participou desta carona.");

        // Verifica se o avaliado participou da carona
        boolean avaliadoParticipou = carona.getMotoristaId().equals(req.getAvaliadoId())
                || solicitacaoRepository.findMaisRecenteByCaronaIdAndPassageiroId(req.getCaronaId(), req.getAvaliadoId())
                        .map(s -> s.getStatus() == StatusSolicitacao.CONCLUIDA).orElse(false);

        if (!avaliadoParticipou)
            throw new BusinessException("O participante avaliado não esteve nesta carona.");

        if (avaliacaoRepository.existsByAvaliadorIdAndAvaliadoIdAndCaronaId(
                avaliadorId, req.getAvaliadoId(), req.getCaronaId()))
            throw new BusinessException("Você já avaliou este participante nesta carona.");

        Avaliacao a = new Avaliacao();
        a.setAvaliadorId(avaliadorId);
        a.setAvaliadoId(req.getAvaliadoId());
        a.setCarona(carona);
        a.setNota(req.getNota());
        a.setComentario(req.getComentario());
        if (req.getTags() != null && !req.getTags().isEmpty()) {
            a.setTags(String.join(",", req.getTags()));
        }

        AvaliacaoResponse response = toResponse(avaliacaoRepository.save(a));

        try {
            Double novaMedia = avaliacaoRepository.mediaByAvaliadoId(req.getAvaliadoId()).orElse(null);
            if (novaMedia != null) {
                userServiceClient.atualizarMediaAvaliacoes(req.getAvaliadoId(), novaMedia);
            }
        } catch (Exception e) {
            log.warn("Não foi possível sincronizar média de avaliações para participanteId={}: {}",
                    req.getAvaliadoId(), e.getMessage());
        }

        return response;
    }

    public List<AvaliacaoResponse> listarPorParticipante(Long participanteId) {
        return avaliacaoRepository.findByAvaliadoId(participanteId)
                .stream().map(this::toResponse).toList();
    }

    public Double mediaParticipante(Long participanteId) {
        return avaliacaoRepository.mediaByAvaliadoId(participanteId).orElse(null);
    }

    public AvaliacaoResponse toResponse(Avaliacao a) {
        return AvaliacaoResponse.builder()
                .id(a.getId())
                .avaliadorId(a.getAvaliadorId())
                .avaliadoId(a.getAvaliadoId())
                .caronaId(a.getCarona().getId())
                .nota(a.getNota())
                .comentario(a.getComentario())
                .tags(a.getTags() != null ? Arrays.asList(a.getTags().split(",")) : Collections.emptyList())
                .criadoEm(a.getCriadoEm())
                .build();
    }
}
