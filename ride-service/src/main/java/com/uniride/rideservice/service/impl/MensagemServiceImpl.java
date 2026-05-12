package com.uniride.rideservice.service.impl;

import com.uniride.rideservice.client.UserServiceClient;
import com.uniride.rideservice.dto.request.MensagemRequest;
import com.uniride.rideservice.dto.response.MensagemResponse;
import com.uniride.rideservice.dto.response.PerfilPassageiroResponse;
import com.uniride.rideservice.entity.Carona;
import com.uniride.rideservice.entity.Mensagem;
import com.uniride.rideservice.enums.StatusCarona;
import com.uniride.rideservice.enums.StatusPagamento;
import com.uniride.rideservice.enums.StatusSolicitacao;
import com.uniride.rideservice.enums.TipoMensagem;
import com.uniride.rideservice.exception.BusinessException;
import com.uniride.rideservice.exception.RecursoNaoEncontradoException;
import com.uniride.rideservice.repository.CaronaRepository;
import com.uniride.rideservice.repository.MensagemRepository;
import com.uniride.rideservice.repository.SolicitacaoRepository;
import com.uniride.rideservice.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class MensagemServiceImpl {

    private final MensagemRepository mensagemRepository;
    private final CaronaRepository caronaRepository;
    private final SolicitacaoRepository solicitacaoRepository;
    private final UserServiceClient userServiceClient;
    private final NotificationService notificationService;

    private static final List<StatusSolicitacao> STATUS_PARTICIPANTE = List.of(
            StatusSolicitacao.APROVADA,
            StatusSolicitacao.EMBARCADO,
            StatusSolicitacao.CONCLUIDA
    );

    @Transactional(readOnly = true)
    public List<MensagemResponse> listar(Long caronaId, Long usuarioId) {
        Carona carona = buscarCarona(caronaId);
        validarAcesso(carona, usuarioId);
        return mensagemRepository.findByCaronaIdOrderByCriadoEmAsc(caronaId)
                .stream().map(this::toResponse).toList();
    }

    @Transactional
    public MensagemResponse enviar(Long caronaId, Long remetenteId, MensagemRequest req) {
        Carona carona = buscarCarona(caronaId);
        validarAcesso(carona, remetenteId);
        if (carona.getStatus() == StatusCarona.CONCLUIDA)
            throw new BusinessException("O chat desta carona está encerrado.");

        if (req.getTipo() == TipoMensagem.TEXTO
                && (req.getConteudo() == null || req.getConteudo().isBlank()))
            throw new BusinessException("O conteúdo da mensagem não pode ser vazio.");
        if (req.getTipo() == TipoMensagem.COMPROVANTE
                && (req.getImagemBase64() == null || req.getImagemBase64().isBlank()))
            throw new BusinessException("A imagem do comprovante não pode ser vazia.");
        if (req.getTipo() == TipoMensagem.PIX_KEY) {
            if (!carona.getMotoristaId().equals(remetenteId))
                throw new BusinessException("Apenas o motorista pode definir a chave PIX.");
            if (req.getConteudo() == null || req.getConteudo().isBlank())
                throw new BusinessException("A chave PIX não pode ser vazia.");
        }

        Mensagem m = new Mensagem();
        m.setCaronaId(caronaId);
        m.setRemetenteId(remetenteId);
        m.setTipo(req.getTipo());
        m.setConteudo(req.getConteudo());
        m.setImagemBase64(req.getImagemBase64());

        MensagemResponse response = toResponse(mensagemRepository.save(m));

        if (req.getTipo() == TipoMensagem.COMPROVANTE && !carona.getMotoristaId().equals(remetenteId)) {
            // Atualiza statusPagamento da solicitação do remetente
            solicitacaoRepository.findMaisRecenteByCaronaIdAndPassageiroId(caronaId, remetenteId)
                    .ifPresent(s -> {
                        s.setStatusPagamento(StatusPagamento.COMPROVANTE_ENVIADO);
                        solicitacaoRepository.save(s);
                    });

            notificationService.notificar(
                    carona.getMotoristaId(),
                    "Comprovante de pagamento recebido",
                    "Um passageiro enviou o comprovante da carona.",
                    Map.of("tipo", "COMPROVANTE_RECEBIDO", "caronaId", caronaId)
            );
        }

        return response;
    }

    private void validarAcesso(Carona carona, Long usuarioId) {
        if (carona.getMotoristaId().equals(usuarioId)) return;
        boolean participante = solicitacaoRepository.existsByCaronaIdAndPassageiroIdAndStatusIn(
                carona.getId(), usuarioId, STATUS_PARTICIPANTE);
        if (!participante)
            throw new BusinessException("Você não tem acesso ao chat desta carona.");
    }

    private Carona buscarCarona(Long id) {
        return caronaRepository.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Carona"));
    }

    private MensagemResponse toResponse(Mensagem m) {
        String nome = null;
        String foto = null;
        try {
            PerfilPassageiroResponse perfil = userServiceClient.buscarPerfilPassageiro(m.getRemetenteId());
            if (perfil != null) {
                nome = perfil.getNome();
                foto = perfil.getFotoPerfil();
            }
        } catch (Exception e) {
            log.warn("Não foi possível buscar perfil do remetente id={}: {}", m.getRemetenteId(), e.getMessage());
        }
        return MensagemResponse.builder()
                .id(m.getId())
                .caronaId(m.getCaronaId())
                .remetenteId(m.getRemetenteId())
                .nomeRemetente(nome)
                .fotoRemetente(foto)
                .conteudo(m.getConteudo())
                .imagemBase64(m.getImagemBase64())
                .tipo(m.getTipo())
                .criadoEm(m.getCriadoEm())
                .build();
    }
}
