package com.uniride.rideservice.service.impl;

import com.uniride.rideservice.client.UserServiceClient;
import com.uniride.rideservice.dto.request.SolicitarVagaRequest;
import com.uniride.rideservice.dto.response.PerfilPassageiroResponse;
import com.uniride.rideservice.dto.response.SolicitacaoResponse;
import com.uniride.rideservice.entity.Carona;
import com.uniride.rideservice.entity.Solicitacao;
import com.uniride.rideservice.enums.StatusCarona;
import com.uniride.rideservice.enums.StatusPagamento;
import com.uniride.rideservice.enums.StatusSolicitacao;
import com.uniride.rideservice.exception.BusinessException;
import com.uniride.rideservice.exception.RecursoNaoEncontradoException;
import com.uniride.rideservice.repository.AvaliacaoRepository;
import com.uniride.rideservice.repository.CaronaRepository;
import com.uniride.rideservice.repository.SolicitacaoRepository;
import com.uniride.rideservice.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ThreadLocalRandom;

@Service
@RequiredArgsConstructor
@Slf4j
public class SolicitacaoServiceImpl {

    private final SolicitacaoRepository solicitacaoRepository;
    private final CaronaRepository caronaRepository;
    private final UserServiceClient userServiceClient;
    private final AvaliacaoRepository avaliacaoRepository;
    private final NotificationService notificationService;

    @Transactional
    public SolicitacaoResponse solicitar(Long caronaId, Long passageiroId,
                                          SolicitarVagaRequest req) {
        Carona carona = buscarCarona(caronaId);

        if (carona.getMotoristaId().equals(passageiroId))
            throw new BusinessException("Você não pode solicitar sua própria carona.");
        if (carona.getStatus() != StatusCarona.AGENDADA)
            throw new BusinessException("Esta carona não está mais disponível.");
        if (carona.getVagasDisponiveis() <= 0)
            throw new BusinessException("Não há vagas disponíveis nesta carona.");

        // Verifica amizade — apenas amigos podem solicitar vaga
        try {
            boolean amigos = userServiceClient.saoAmigos(passageiroId, carona.getMotoristaId()).isAmigos();
            if (!amigos)
                throw new BusinessException("Você precisa ser amigo do motorista para solicitar esta carona.");
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.warn("Não foi possível verificar amizade com motorista id={}: {}", carona.getMotoristaId(), e.getMessage());
            throw new BusinessException("Não foi possível verificar sua amizade com o motorista. Tente novamente.");
        }

        boolean jaExiste = solicitacaoRepository.existsByCaronaIdAndPassageiroIdAndStatusNotIn(
                caronaId, passageiroId,
                List.of(StatusSolicitacao.CANCELADA, StatusSolicitacao.RECUSADA));
        if (jaExiste) throw new BusinessException("Você já tem uma solicitação ativa para esta carona.");

        // Reaproveita linha existente (CANCELADA ou RECUSADA) para evitar duplicata no banco
        Optional<Solicitacao> anterior = solicitacaoRepository.findMaisRecenteByCaronaIdAndPassageiroId(caronaId, passageiroId);
        Solicitacao s = anterior.orElseGet(() -> {
            Solicitacao nova = new Solicitacao();
            nova.setCarona(carona);
            nova.setPassageiroId(passageiroId);
            return nova;
        });
        s.setStatus(StatusSolicitacao.PENDENTE);
        if (req != null) {
            s.setLatDestino(req.getLatDestino());
            s.setLngDestino(req.getLngDestino());
            s.setEnderecoDestino(req.getEnderecoDestino());
            s.setMensagem(req.getMensagem());
        }
        SolicitacaoResponse response = toResponse(solicitacaoRepository.save(s));

        // Notifica o motorista
        notificationService.notificar(
                carona.getMotoristaId(),
                "Nova solicitação de carona",
                "Você tem uma nova solicitação para \"" + carona.getNome() + "\".",
                Map.of("tipo", "SOLICITACAO_PENDENTE", "caronaId", caronaId, "solicitacaoId", response.getId())
        );

        return response;
    }

    @Transactional(readOnly = true)
    public List<SolicitacaoResponse> listarPorCarona(Long caronaId) {
        return solicitacaoRepository.findAtivasByCaronaId(caronaId)
                .stream().map(s -> toResponseMinhas(s, s.getPassageiroId())).toList();
    }

    @Transactional(readOnly = true)
    public List<SolicitacaoResponse> listarMinhas(Long passageiroId) {
        return solicitacaoRepository.findByPassageiroId(passageiroId)
                .stream().map(s -> toResponseMinhas(s, passageiroId)).toList();
    }

    @Transactional(readOnly = true)
    public List<SolicitacaoResponse> listarRecebidas(Long motoristaId) {
        return solicitacaoRepository.findRecebidasAtivasByMotoristaId(motoristaId)
                .stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public Page<SolicitacaoResponse> historico(Long passageiroId, Pageable pageable) {
        return solicitacaoRepository.findHistoricoByPassageiroId(passageiroId, pageable)
                .map(this::toResponse);
    }

    @Transactional
    public SolicitacaoResponse aprovar(Long solicitacaoId, Long motoristaId) {
        Solicitacao s = buscarSolicitacao(solicitacaoId);
        validarMotorista(s, motoristaId);
        if (s.getStatus() != StatusSolicitacao.PENDENTE)
            throw new BusinessException("Apenas solicitações pendentes podem ser aprovadas.");
        if (s.getCarona().getVagasDisponiveis() <= 0)
            throw new BusinessException("Não há mais vagas disponíveis.");

        s.setStatus(StatusSolicitacao.APROVADA);
        s.setPinEmbarque(String.format("%04d", ThreadLocalRandom.current().nextInt(0, 10000)));
        Carona carona = s.getCarona();
        carona.setVagasDisponiveis(carona.getVagasDisponiveis() - 1);
        caronaRepository.save(carona);
        SolicitacaoResponse response = toResponseMinhas(solicitacaoRepository.save(s), s.getPassageiroId());

        // Notifica o passageiro
        notificationService.notificar(
                s.getPassageiroId(),
                "Solicitação aprovada!",
                "Sua vaga em \"" + carona.getNome() + "\" foi confirmada pelo motorista.",
                Map.of("tipo", "SOLICITACAO_APROVADA", "caronaId", carona.getId(), "solicitacaoId", solicitacaoId)
        );

        return response;
    }

    @Transactional
    public SolicitacaoResponse recusar(Long solicitacaoId, Long motoristaId) {
        Solicitacao s = buscarSolicitacao(solicitacaoId);
        validarMotorista(s, motoristaId);
        if (s.getStatus() != StatusSolicitacao.PENDENTE)
            throw new BusinessException("Apenas solicitações pendentes podem ser recusadas.");
        s.setStatus(StatusSolicitacao.RECUSADA);
        SolicitacaoResponse response = toResponse(solicitacaoRepository.save(s));

        // Notifica o passageiro
        notificationService.notificar(
                s.getPassageiroId(),
                "Solicitação recusada",
                "Sua solicitação para \"" + s.getCarona().getNome() + "\" não foi aprovada.",
                Map.of("tipo", "SOLICITACAO_RECUSADA", "caronaId", s.getCarona().getId())
        );

        return response;
    }

    @Transactional
    public SolicitacaoResponse embarcar(Long solicitacaoId, Long motoristaId, String pin) {
        Solicitacao s = buscarSolicitacao(solicitacaoId);
        validarMotorista(s, motoristaId);
        if (s.getStatus() != StatusSolicitacao.APROVADA)
            throw new BusinessException("Apenas passageiros aprovados podem ser embarcados.");

        StatusCarona statusCarona = s.getCarona().getStatus();
        if (statusCarona != StatusCarona.AGENDADA && statusCarona != StatusCarona.EM_ANDAMENTO)
            throw new BusinessException("O embarque só pode ser confirmado em caronas agendadas ou em andamento.");

        String pinEsperado = s.getPinEmbarque();
        if (pinEsperado == null || !pinEsperado.equals(pin))
            throw new BusinessException("PIN inválido. Peça ao passageiro que informe o código exibido no app.");

        s.setStatus(StatusSolicitacao.EMBARCADO);
        log.info("Motorista id={} confirmou embarque da solicitacao id={} via PIN", motoristaId, solicitacaoId);
        return toResponse(solicitacaoRepository.save(s));
    }

    @Transactional
    public SolicitacaoResponse naoCompareceu(Long solicitacaoId, Long motoristaId) {
        Solicitacao s = buscarSolicitacao(solicitacaoId);
        validarMotorista(s, motoristaId);
        if (s.getStatus() != StatusSolicitacao.APROVADA)
            throw new BusinessException("Apenas passageiros aprovados podem ser marcados como não compareceu.");
        StatusCarona sc = s.getCarona().getStatus();
        if (sc != StatusCarona.AGENDADA && sc != StatusCarona.EM_ANDAMENTO)
            throw new BusinessException("Esta ação só é permitida em caronas agendadas ou em andamento.");
        s.setStatus(StatusSolicitacao.CANCELADA);
        Carona carona = s.getCarona();
        carona.setVagasDisponiveis(carona.getVagasDisponiveis() + 1);
        caronaRepository.save(carona);
        log.info("Motorista id={} marcou passageiro da solicitacao id={} como não compareceu.", motoristaId, solicitacaoId);
        return toResponse(solicitacaoRepository.save(s));
    }

    @Transactional
    public SolicitacaoResponse confirmarPagamento(Long solicitacaoId, Long motoristaId) {
        Solicitacao s = buscarSolicitacao(solicitacaoId);
        validarMotorista(s, motoristaId);
        if (s.getStatusPagamento() != StatusPagamento.COMPROVANTE_ENVIADO)
            throw new BusinessException("Não há comprovante enviado para confirmar.");
        s.setStatusPagamento(StatusPagamento.PAGO_CONFIRMADO);
        SolicitacaoResponse response = toResponseMinhas(solicitacaoRepository.save(s), s.getPassageiroId());

        notificationService.notificar(
                s.getPassageiroId(),
                "Pagamento confirmado!",
                "O motorista confirmou o recebimento do seu pagamento.",
                Map.of("tipo", "PAGAMENTO_CONFIRMADO",
                        "caronaId", s.getCarona().getId(),
                        "solicitacaoId", solicitacaoId)
        );

        return response;
    }

    @Transactional
    public void cancelar(Long solicitacaoId, Long passageiroId) {
        Solicitacao s = buscarSolicitacao(solicitacaoId);
        if (!s.getPassageiroId().equals(passageiroId))
            throw new BusinessException("Você não tem permissão para cancelar esta solicitação.");
        if (s.getCarona().getStatus() == StatusCarona.EM_ANDAMENTO)
            throw new BusinessException("Não é possível cancelar após a carona iniciar.");

        if (s.getStatus() == StatusSolicitacao.APROVADA) {
            Carona carona = s.getCarona();
            carona.setVagasDisponiveis(carona.getVagasDisponiveis() + 1);
            caronaRepository.save(carona);
        }
        s.setStatus(StatusSolicitacao.CANCELADA);
        solicitacaoRepository.save(s);
    }

    private Carona buscarCarona(Long id) {
        return caronaRepository.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Carona"));
    }

    private Solicitacao buscarSolicitacao(Long id) {
        return solicitacaoRepository.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Solicitação"));
    }

    private void validarMotorista(Solicitacao s, Long motoristaId) {
        if (!s.getCarona().getMotoristaId().equals(motoristaId))
            throw new BusinessException("Você não tem permissão sobre esta solicitação.");
    }

    public SolicitacaoResponse toResponseMinhas(Solicitacao s, Long passageiroId) {
        SolicitacaoResponse resp = toResponse(s);
        boolean jaAvaliou = avaliacaoRepository.existsByAvaliadorIdAndAvaliadoIdAndCaronaId(
                passageiroId,
                s.getCarona().getMotoristaId(),
                s.getCarona().getId()
        );
        resp.setJaAvaliouMotorista(jaAvaliou);
        // PIN visível apenas ao próprio passageiro, somente enquanto não embarcou
        if (s.getStatus() == StatusSolicitacao.APROVADA) {
            resp.setPinEmbarque(s.getPinEmbarque());
        }
        return resp;
    }

    public SolicitacaoResponse toResponse(Solicitacao s) {
        String nomePassageiro = null;
        String fotoPassageiro = null;
        try {
            PerfilPassageiroResponse perfil = userServiceClient.buscarPerfilPassageiro(s.getPassageiroId());
            if (perfil != null) {
                nomePassageiro = perfil.getNome();
                fotoPassageiro = perfil.getFotoPerfil();
            }
        } catch (Exception e) {
            log.warn("Nao foi possivel buscar perfil do passageiro id={}: {}", s.getPassageiroId(), e.getMessage());
        }

        return SolicitacaoResponse.builder()
                .id(s.getId())
                .caronaId(s.getCarona().getId())
                .passageiroId(s.getPassageiroId())
                .nomePassageiro(nomePassageiro)
                .fotoPassageiro(fotoPassageiro)
                .latDestino(s.getLatDestino())
                .lngDestino(s.getLngDestino())
                .enderecoDestino(s.getEnderecoDestino())
                .nomeCarona(s.getCarona().getNome())
                .direcao(s.getCarona().getDirecao())
                .status(s.getStatus())
                .statusPagamento(s.getStatusPagamento())
                .mensagem(s.getMensagem())
                .criadoEm(s.getCriadoEm())
                .dataCarona(s.getCarona().getData())
                .horarioSaida(s.getCarona().getHorarioSaida())
                .vagasDisponiveis(s.getCarona().getVagasDisponiveis())
                .vagasTotal(s.getCarona().getVagasTotal())
                .build();
    }
}
