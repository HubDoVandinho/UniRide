package com.uniride.rideservice.service.impl;

import com.uniride.rideservice.client.UserServiceClient;
import com.uniride.rideservice.dto.request.AtualizarRotinaRequest;
import com.uniride.rideservice.dto.request.CriarRotinaRequest;
import com.uniride.rideservice.dto.response.RotinaResponse;
import com.uniride.rideservice.dto.response.VeiculoInfoResponse;
import com.uniride.rideservice.entity.Rotina;
import com.uniride.rideservice.enums.StatusRotina;
import com.uniride.rideservice.exception.BusinessException;
import com.uniride.rideservice.exception.RecursoNaoEncontradoException;
import com.uniride.rideservice.entity.Carona;
import com.uniride.rideservice.entity.Solicitacao;
import com.uniride.rideservice.enums.StatusCarona;
import com.uniride.rideservice.enums.StatusSolicitacao;
import com.uniride.rideservice.repository.CaronaRepository;
import com.uniride.rideservice.repository.RotinaRepository;
import com.uniride.rideservice.repository.SolicitacaoRepository;
import com.uniride.rideservice.util.HaversineUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class RotinaServiceImpl {

    private final RotinaRepository rotinaRepository;
    private final CaronaRepository caronaRepository;
    private final SolicitacaoRepository solicitacaoRepository;
    private final UserServiceClient userServiceClient;

    @Transactional
    public RotinaResponse criar(CriarRotinaRequest req, Long motoristaId, Long instituicaoId) {
        if (req.getNome() != null && !req.getNome().isBlank()
                && rotinaRepository.existsByMotoristaIdAndNomeIgnoreCase(motoristaId, req.getNome().trim()))
            throw new BusinessException("Você já tem uma rotina com o nome \"" + req.getNome().trim() + "\". Escolha um nome diferente.");

        Rotina r = new Rotina();
        r.setMotoristaId(motoristaId);
        r.setInstituicaoId(instituicaoId);
        r.setOrigem(req.getOrigem());
        r.setBairroOrigem(req.getBairroOrigem());
        r.setDestino(req.getDestino());
        r.setBairroDestino(req.getBairroDestino());
        r.setLatOrigem(req.getLatOrigem());
        r.setLngOrigem(req.getLngOrigem());
        r.setLatDestino(req.getLatDestino());
        r.setLngDestino(req.getLngDestino());
        r.setRaioAceito(req.getRaioAceito() != null ? req.getRaioAceito() : 2.0);
        r.setDiasDaSemana(req.getDiasDaSemana());
        r.setHorarioSaida(req.getHorarioSaida());
        r.setValorSugerido(req.getValorSugerido());
        r.setVagasTotal(req.getVagasTotal());
        r.setModoFixo(req.getModoFixo() != null && req.getModoFixo());
        r.setDataInicio(req.getDataInicio());
        r.setDataFim(req.getDataFim());
        r.setNome(req.getNome());
        r.setObservacoes(req.getObservacoes());
        r.setPixKey(req.getPixKey());
        r.setDirecao(req.getDirecao());
        r.setStatus(StatusRotina.ATIVA);

        try {
            VeiculoInfoResponse veiculo = userServiceClient.buscarVeiculo(motoristaId);
            if (veiculo != null) {
                if (!Boolean.TRUE.equals(veiculo.getAprovadoAdmin()))
                    throw new BusinessException("Sua CNH ainda está em análise. Aguarde a aprovação do administrador para criar rotinas.");
                if (veiculo.getValidadeCnh() != null && veiculo.getValidadeCnh().isBefore(LocalDate.now()))
                    throw new BusinessException("A CNH do motorista está vencida. Regularize antes de criar uma rotina.");
                // RN5 — vagas derivadas da capacidade do veículo, não do input do usuário
                r.setVagasTotal(veiculo.getCapacidade());
            }
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.warn("Não foi possível validar veículo/CNH para motorista id={}: {}", motoristaId, e.getMessage());
        }

        log.info("Rotina criada para motorista id={}", motoristaId);
        return toResponse(rotinaRepository.save(r));
    }

    @Transactional
    public RotinaResponse atualizar(Long rotinaId, AtualizarRotinaRequest req, Long motoristaId) {
        Rotina r = buscarDoMotorista(rotinaId, motoristaId);
        if (req.getNome() != null && !req.getNome().isBlank()) {
            String novoNome = req.getNome().trim();
            boolean nomeAlterado = r.getNome() == null || !r.getNome().equalsIgnoreCase(novoNome);
            if (nomeAlterado && rotinaRepository.existsByMotoristaIdAndNomeIgnoreCase(motoristaId, novoNome))
                throw new BusinessException("Você já tem uma rotina com o nome \"" + novoNome + "\". Escolha um nome diferente.");
        }
        if (req.getNome() != null)         r.setNome(req.getNome().isBlank() ? null : req.getNome().trim());
        if (req.getHorarioSaida() != null) r.setHorarioSaida(req.getHorarioSaida());
        if (req.getDiasDaSemana() != null && !req.getDiasDaSemana().isEmpty())
                                           r.setDiasDaSemana(req.getDiasDaSemana());
        if (req.getRaioAceito() != null)   r.setRaioAceito(req.getRaioAceito());
        if (req.getObservacoes() != null)  r.setObservacoes(req.getObservacoes().isBlank() ? null : req.getObservacoes().trim());
        // pixKey pode ser definida ou apagada (null limpa a chave)
        r.setPixKey(req.getPixKey() == null || req.getPixKey().isBlank() ? null : req.getPixKey().trim());
        log.info("Rotina id={} atualizada pelo motorista id={}", rotinaId, motoristaId);
        return toResponse(rotinaRepository.save(r));
    }

    public Rotina buscarRotina(Long id, Long motoristaId) {
        Rotina r = rotinaRepository.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Rotina"));
        if (!r.getMotoristaId().equals(motoristaId))
            throw new BusinessException("Você não tem permissão sobre esta rotina.");
        return r;
    }

    public List<RotinaResponse> listarMinhas(Long motoristaId) {
        return rotinaRepository.findByMotoristaId(motoristaId)
                .stream().map(this::toResponse).toList();
    }

    public RotinaResponse buscarAgenda(Long motoristaId, Long solicitanteId) {
        if (!motoristaId.equals(solicitanteId)) {
            boolean amigos = userServiceClient.saoAmigos(solicitanteId, motoristaId).isAmigos();
            if (!amigos) throw new BusinessException("Você precisa ser amigo do motorista para ver a agenda.");
        }
        return rotinaRepository.findByMotoristaId(motoristaId).stream()
                .filter(r -> r.getStatus() == StatusRotina.ATIVA)
                .findFirst().map(this::toResponse)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Rotina ativa"));
    }

    public Page<RotinaResponse> buscarPorProximidade(Double lat, Double lng,
                                                      Double raioKm, Long solicitanteId,
                                                      Pageable pageable) {
        List<Rotina> rotinas = rotinaRepository.findAtivasComCoordenadas(LocalDate.now());
        List<RotinaResponse> resultado = new ArrayList<>();

        for (Rotina r : rotinas) {
            if (r.getMotoristaId().equals(solicitanteId)) continue;
            try {
                boolean amigos = userServiceClient.saoAmigos(solicitanteId, r.getMotoristaId()).isAmigos();
                if (!amigos) continue;
            } catch (Exception e) { continue; }

            double dist = HaversineUtil.calcular(lat, lng, r.getLatOrigem(), r.getLngOrigem());
            if (dist <= r.getRaioAceito()) {
                RotinaResponse resp = toResponse(r);
                resp.setDistanciaKm(Math.round(dist * 10.0) / 10.0);
                resultado.add(resp);
            }
        }
        resultado.sort((a, b) -> Double.compare(
                a.getDistanciaKm() != null ? a.getDistanciaKm() : Double.MAX_VALUE,
                b.getDistanciaKm() != null ? b.getDistanciaKm() : Double.MAX_VALUE));

        int start  = (int) pageable.getOffset();
        int end    = Math.min(start + pageable.getPageSize(), resultado.size());
        List<RotinaResponse> pagina = start >= resultado.size() ? List.of() : resultado.subList(start, end);
        return new PageImpl<>(pagina, pageable, resultado.size());
    }

    @Transactional
    public void excluir(Long rotinaId, Long motoristaId, boolean cancelarCaronas) {
        buscarDoMotorista(rotinaId, motoristaId);

        if (cancelarCaronas) {
            List<Carona> caronasAtivas = caronaRepository.findByRotinaId(rotinaId).stream()
                    .filter(c -> c.getStatus() == StatusCarona.AGENDADA)
                    .toList();

            for (Carona c : caronasAtivas) {
                List<Solicitacao> ativas = solicitacaoRepository.findPendentesEAprovadasByCaronaId(c.getId());
                ativas.forEach(s -> s.setStatus(StatusSolicitacao.CANCELADA));
                solicitacaoRepository.saveAll(ativas);
                c.setStatus(StatusCarona.CANCELADA);
                caronaRepository.save(c);
            }
            log.info("Rotina id={}: {} caronas ativas canceladas.", rotinaId, caronasAtivas.size());
        }

        // Desvincular todas as caronas da rotina antes de deletar (preserva histórico)
        // Usa UPDATE direto para garantir flush antes do deleteById e evitar violação de FK
        caronaRepository.desvincularRotina(rotinaId);

        rotinaRepository.deleteById(rotinaId);
        log.info("Rotina id={} excluída pelo motorista id={}. cancelarCaronas={}", rotinaId, motoristaId, cancelarCaronas);
    }

    private Rotina buscarDoMotorista(Long rotinaId, Long motoristaId) {
        Rotina r = rotinaRepository.findById(rotinaId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Rotina"));
        if (!r.getMotoristaId().equals(motoristaId))
            throw new BusinessException("Você não tem permissão sobre esta rotina.");
        return r;
    }

    public RotinaResponse toResponse(Rotina r) {
        return RotinaResponse.builder()
                .id(r.getId()).motoristaId(r.getMotoristaId())
                .origem(r.getOrigem()).bairroOrigem(r.getBairroOrigem())
                .destino(r.getDestino()).bairroDestino(r.getBairroDestino())
                .latOrigem(r.getLatOrigem()).lngOrigem(r.getLngOrigem())
                .latDestino(r.getLatDestino()).lngDestino(r.getLngDestino())
                .raioAceito(r.getRaioAceito()).diasDaSemana(r.getDiasDaSemana())
                .horarioSaida(r.getHorarioSaida()).turno(r.getTurno())
                .valorSugerido(r.getValorSugerido()).vagasTotal(r.getVagasTotal())
                .modoFixo(r.getModoFixo()).dataInicio(r.getDataInicio())
                .dataFim(r.getDataFim()).status(r.getStatus())
                .nome(r.getNome()).observacoes(r.getObservacoes())
                .pixKey(r.getPixKey()).direcao(r.getDirecao()).build();
    }
}
