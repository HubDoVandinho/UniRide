package com.uniride.rideservice.service.impl;

import com.uniride.rideservice.client.UserServiceClient;
import com.uniride.rideservice.dto.response.CaronaResponse;
import com.uniride.rideservice.dto.response.SaoAmigosResponse;
import com.uniride.rideservice.dto.response.RotaResponse;
import com.uniride.rideservice.entity.Carona;
import com.uniride.rideservice.entity.Rotina;
import com.uniride.rideservice.entity.Solicitacao;
import com.uniride.rideservice.enums.Direcao;
import com.uniride.rideservice.enums.StatusCarona;
import com.uniride.rideservice.enums.StatusSolicitacao;
import com.uniride.rideservice.exception.BusinessException;
import com.uniride.rideservice.exception.RecursoNaoEncontradoException;
import com.uniride.rideservice.repository.AvaliacaoRepository;
import com.uniride.rideservice.repository.CaronaRepository;
import com.uniride.rideservice.repository.SolicitacaoRepository;
import com.uniride.rideservice.service.NotificationService;
import com.uniride.rideservice.util.HaversineUtil;
import com.uniride.rideservice.util.RotaUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class CaronaServiceImpl {

    private final CaronaRepository caronaRepository;
    private final SolicitacaoRepository solicitacaoRepository;
    private final UserServiceClient userServiceClient;
    private final AvaliacaoRepository avaliacaoRepository;
    private final NotificationService notificationService;

    public Page<CaronaResponse> listarMural(Long instituicaoId, Pageable pageable) {
        return caronaRepository.findMural(instituicaoId, LocalDate.now(), pageable)
                .map(this::toResponse);
    }

    @Transactional
    public CaronaResponse gerarDeRotina(Rotina rotina, Long motoristaId, Long instituicaoId, LocalDate data) {
        if (caronaRepository.existsAtivaPorRotinaEData(rotina.getId(), data))
            throw new BusinessException("Já existe uma carona desta rotina para a data " + data + ".");

        // RN4 — máx. 1 carona de IDA e 1 de VOLTA por dia por motorista
        if (rotina.getDirecao() != null &&
                caronaRepository.existsAtivaPorMotoristaDataEDirecao(motoristaId, data, rotina.getDirecao())) {
            String dir = rotina.getDirecao().name().equals("IDA") ? "ida" : "volta";
            throw new BusinessException("Você já tem uma carona de " + dir + " agendada para " + data + ".");
        }

        Carona c = new Carona();
        c.setRotinaId(rotina.getId());
        c.setMotoristaId(motoristaId);
        c.setInstituicaoId(instituicaoId);
        long seq = caronaRepository.countByRotinaId(rotina.getId()) + 1;
        c.setNome(rotina.getNome() + " #" + seq);
        c.setOrigem(rotina.getOrigem());
        c.setBairroOrigem(rotina.getBairroOrigem());
        c.setDestino(rotina.getDestino());
        c.setBairroDestino(rotina.getBairroDestino());
        c.setLatOrigem(rotina.getLatOrigem());
        c.setLngOrigem(rotina.getLngOrigem());
        c.setLatDestino(rotina.getLatDestino());
        c.setLngDestino(rotina.getLngDestino());
        c.setData(data);
        c.setHorarioSaida(rotina.getHorarioSaida());
        c.setRaioAceito(rotina.getRaioAceito());
        c.setVagasTotal(rotina.getVagasTotal());
        c.setVagasDisponiveis(rotina.getVagasTotal());
        c.setValorSugerido(rotina.getValorSugerido() != null
                ? rotina.getValorSugerido()
                : calcularValorSugerido(rotina));
        c.setObservacoes(rotina.getObservacoes());
        c.setPixKey(rotina.getPixKey());
        c.setDirecao(rotina.getDirecao());
        log.info("Carona gerada da rotina id={} para data={}", rotina.getId(), data);
        return toResponse(caronaRepository.save(c));
    }

    public Page<CaronaResponse> buscarPorProximidade(Double lat, Double lng,
                                                      Direcao direcao,
                                                      Long solicitanteId,
                                                      Long instituicaoId,
                                                      List<Long> preferencias,
                                                      Pageable pageable) {
        Set<Long> motoristasFiltrados = null;
        if (preferencias != null && !preferencias.isEmpty()) {
            try {
                motoristasFiltrados = new HashSet<>(
                        userServiceClient.motoristasPorPreferencias(preferencias));
            } catch (Exception e) {
                log.warn("Falha ao filtrar motoristas por preferências: {}", e.getMessage());
            }
        }

        final Set<Long> filtro = motoristasFiltrados;

        // Ponto 4: coordenadas obrigatórias — sem elas não há como filtrar por proximidade
        if (lat == null || lng == null) {
            log.info("[BUSCA] lat/lng ausentes — retornando lista vazia");
            return new PageImpl<>(List.of(), pageable, 0);
        }

        // Ponto 3: bounding box de ~15 km filtra no SQL antes de trazer para memória
        // 0.135° ≈ 15 km em latitude; usamos o mesmo delta em longitude (conservador para BR)
        final double DELTA = 0.135;
        List<Carona> candidatas = caronaRepository.findAgendadasNaBoundingBox(
                LocalDate.now(), instituicaoId,
                lat - DELTA, lat + DELTA,
                lng - DELTA, lng + DELTA);
        log.info("[BUSCA] instId={} solicitanteId={} lat={} lng={} direcao={} | bbox: {}",
                instituicaoId, solicitanteId, lat, lng, direcao, candidatas.size());

        // Fase 1 — filtros (sem DB extra)
        List<Carona> filtradas = candidatas.stream()
                .filter(c -> {
                    boolean ok = !c.getMotoristaId().equals(solicitanteId);
                    if (!ok) log.info("[BUSCA] caronaId={} FILTRADA: próprio motorista", c.getId());
                    return ok;
                })
                .filter(c -> {
                    boolean ok = filtro == null || filtro.contains(c.getMotoristaId());
                    if (!ok) log.info("[BUSCA] caronaId={} FILTRADA: preferencias", c.getId());
                    return ok;
                })
                .filter(c -> {
                    if (direcao == null) return true;
                    boolean ok = direcao.equals(c.getDirecao());
                    if (!ok) log.info("[BUSCA] caronaId={} FILTRADA: direcao {} != {}", c.getId(), c.getDirecao(), direcao);
                    return ok;
                })
                .filter(c -> {
                    try {
                        boolean amigos = userServiceClient.saoAmigos(solicitanteId, c.getMotoristaId()).isAmigos();
                        if (!amigos) log.info("[BUSCA] caronaId={} FILTRADA: não são amigos (solicitante={} motorista={})",
                                c.getId(), solicitanteId, c.getMotoristaId());
                        return amigos;
                    } catch (Exception e) {
                        log.warn("[BUSCA] caronaId={} FILTRADA: erro ao checar amizade — {}", c.getId(), e.getMessage());
                        return false;
                    }
                })
                .filter(c -> {
                    double raio = c.getRaioAceito() != null ? c.getRaioAceito() : 2.0;
                    double dist = calcularDistanciaRelevante(c, lat, lng, direcao);
                    log.info("[PROX] caronaId={} direcao={} latO={} lngO={} latD={} lngD={} busca=({},{}) dist={}km raio={}km",
                            c.getId(), c.getDirecao(),
                            c.getLatOrigem(), c.getLngOrigem(), c.getLatDestino(), c.getLngDestino(),
                            lat, lng,
                            dist == Double.MAX_VALUE ? "MAX" : String.format("%.2f", dist), raio);
                    if (dist == Double.MAX_VALUE) {
                        log.info("[BUSCA] caronaId={} FILTRADA: sem coordenadas no endpoint relevante", c.getId());
                        return false;
                    }
                    boolean ok = dist <= raio;
                    if (!ok) log.info("[BUSCA] caronaId={} FILTRADA: fora do raio (dist={}km raio={}km direcao={})",
                            c.getId(), String.format("%.2f", dist), raio, direcao);
                    return ok;
                })
                .toList();

        // Fase 2 — batch-fetch de solicitações aprovadas/embarcadas para todas as caronas filtradas
        List<Long> caronaIds = filtradas.stream().map(Carona::getId).toList();
        Map<Long, List<Solicitacao>> solPorCarona = batchFetchSolicitacoes(caronaIds);

        // Fase 3 — mapear para response com valor dinâmico (rota com waypoints + viewer)
        List<CaronaResponse> todos = filtradas.stream()
                .map(c -> {
                    CaronaResponse r = toResponse(c);
                    double dist = calcularDistanciaRelevante(c, lat, lng, direcao);
                    if (dist != Double.MAX_VALUE)
                        r.setDistanciaKm(Math.round(dist * 10.0) / 10.0);
                    List<Solicitacao> aprovadas = solPorCarona.getOrDefault(c.getId(), List.of());
                    calcularValores(r, c, aprovadas, solicitanteId);
                    return r;
                })
                .sorted((a, b) -> Double.compare(
                        a.getDistanciaKm() != null ? a.getDistanciaKm() : Double.MAX_VALUE,
                        b.getDistanciaKm() != null ? b.getDistanciaKm() : Double.MAX_VALUE))
                .toList();

        int start = (int) pageable.getOffset();
        int end   = Math.min(start + pageable.getPageSize(), todos.size());
        List<CaronaResponse> pagina = start >= todos.size() ? List.of() : todos.subList(start, end);
        return new PageImpl<>(pagina, pageable, todos.size());
    }

    @Transactional(readOnly = true)
    public CaronaResponse buscarPorId(Long id, Long userId) {
        Carona c = buscar(id);
        CaronaResponse resp = toResponse(c);
        resp.setJaAvaliouPassageiros(avaliacaoRepository.existsByAvaliadorIdAndCaronaId(userId, id));
        aplicarValoresDinamicos(resp, c, userId);
        return resp;
    }

    @Transactional
    public CaronaResponse iniciar(Long caronaId, Long motoristaId) {
        Carona c = buscarDoMotorista(caronaId, motoristaId);
        if (c.getStatus() != StatusCarona.AGENDADA)
            throw new BusinessException("Apenas caronas agendadas podem ser iniciadas.");
        if (caronaRepository.existsByMotoristaIdAndStatus(motoristaId, StatusCarona.EM_ANDAMENTO))
            throw new BusinessException("Você já possui uma carona em andamento. Conclua-a antes de iniciar outra.");

        c.setStatus(StatusCarona.EM_ANDAMENTO);
        log.info("Carona id={} iniciada pelo motorista id={}", caronaId, motoristaId);
        CaronaResponse response = toResponse(caronaRepository.save(c));

        // Notifica todos os passageiros aprovados e embarcados
        List<Solicitacao> embarcadosAtivos = solicitacaoRepository.findEmbarcadosByCaronaId(caronaId);
        List<Solicitacao> aprovadosAtivos  = solicitacaoRepository.findAprovadosByCaronaId(caronaId);
        for (Solicitacao s : embarcadosAtivos) {
            notificationService.notificar(
                    s.getPassageiroId(),
                    "Carona iniciada!",
                    "A carona \"" + c.getNome() + "\" já está em andamento.",
                    Map.of("tipo", "CARONA_INICIADA", "caronaId", caronaId)
            );
        }
        for (Solicitacao s : aprovadosAtivos) {
            notificationService.notificar(
                    s.getPassageiroId(),
                    "Carona iniciada!",
                    "A carona \"" + c.getNome() + "\" saiu. Aguarde o motorista no seu ponto de embarque.",
                    Map.of("tipo", "CARONA_INICIADA", "caronaId", caronaId)
            );
        }

        return response;
    }

    @Transactional
    public CaronaResponse concluir(Long caronaId, Long motoristaId) {
        Carona c = buscarDoMotorista(caronaId, motoristaId);
        if (c.getStatus() != StatusCarona.EM_ANDAMENTO)
            throw new BusinessException("Apenas caronas em andamento podem ser concluídas.");
        c.setStatus(StatusCarona.CONCLUIDA);

        List<Solicitacao> embarcados = solicitacaoRepository.findEmbarcadosByCaronaId(caronaId);
        embarcados.forEach(s -> s.setStatus(StatusSolicitacao.CONCLUIDA));
        solicitacaoRepository.saveAll(embarcados);

        // Aprovados que não embarcaram até o encerramento — não compareceram
        List<Solicitacao> aprovadosRestantes = solicitacaoRepository.findAprovadosByCaronaId(caronaId);
        aprovadosRestantes.forEach(s -> {
            s.setStatus(StatusSolicitacao.CANCELADA);
            c.setVagasDisponiveis(c.getVagasDisponiveis() + 1);
        });
        solicitacaoRepository.saveAll(aprovadosRestantes);

        // Rejeita solicitações ainda pendentes (carona encerrada sem aprovação)
        List<Solicitacao> pendentes = solicitacaoRepository.findPendentesByCaronaId(caronaId);
        pendentes.forEach(s -> s.setStatus(StatusSolicitacao.RECUSADA));
        solicitacaoRepository.saveAll(pendentes);

        log.info("Carona id={} concluída. {} concluídos, {} não embarcaram, {} pendentes recusados.",
                caronaId, embarcados.size(), aprovadosRestantes.size(), pendentes.size());
        CaronaResponse response = toResponse(caronaRepository.save(c));

        // Notifica passageiros concluídos para avaliarem
        for (Solicitacao s : embarcados) {
            notificationService.notificar(
                    s.getPassageiroId(),
                    "Carona concluída!",
                    "\"" + c.getNome() + "\" chegou ao destino. Avalie sua experiência!",
                    Map.of("tipo", "CARONA_CONCLUIDA", "caronaId", caronaId)
            );
        }

        return response;
    }

    @Transactional
    public void cancelar(Long caronaId, Long motoristaId) {
        Carona c = buscarDoMotorista(caronaId, motoristaId);
        if (c.getStatus() == StatusCarona.CONCLUIDA)
            throw new BusinessException("Não é possível cancelar uma carona concluída.");
        if (c.getStatus() == StatusCarona.EM_ANDAMENTO)
            throw new BusinessException("Não é possível cancelar uma carona em andamento.");

        List<Solicitacao> ativas = solicitacaoRepository.findPendentesEAprovadasByCaronaId(caronaId);
        int vagasARestaurar = 0;
        for (Solicitacao s : ativas) {
            if (s.getStatus() == StatusSolicitacao.APROVADA) vagasARestaurar++;
            s.setStatus(StatusSolicitacao.CANCELADA);
        }
        solicitacaoRepository.saveAll(ativas);
        c.setVagasDisponiveis(c.getVagasDisponiveis() + vagasARestaurar);
        c.setStatus(StatusCarona.CANCELADA);
        caronaRepository.save(c);
        log.info("Carona id={} cancelada. {} solicitações canceladas, {} vagas restauradas.",
                caronaId, ativas.size(), vagasARestaurar);

        // Notifica passageiros com solicitações ativas (PENDENTE ou APROVADA)
        for (Solicitacao s : ativas) {
            notificationService.notificar(
                    s.getPassageiroId(),
                    "Carona cancelada",
                    "A carona \"" + c.getNome() + "\" foi cancelada pelo motorista.",
                    Map.of("tipo", "CARONA_CANCELADA", "caronaId", caronaId)
            );
        }
    }

    public List<CaronaResponse> listarDeMotorista(Long motoristaId, Long solicitanteId) {
        if (!motoristaId.equals(solicitanteId)) {
            try {
                SaoAmigosResponse amigos = userServiceClient.saoAmigos(solicitanteId, motoristaId);
                if (!amigos.isAmigos())
                    throw new BusinessException("Adicione este motorista como amigo para ver a agenda dele.");
            } catch (BusinessException e) {
                throw e;
            } catch (Exception e) {
                throw new BusinessException("Não foi possível verificar a amizade.");
            }
        }
        List<Carona> caronas = caronaRepository.findUpcomingByMotoristaId(motoristaId, LocalDate.now());
        Map<Long, List<Solicitacao>> solPorCarona = batchFetchSolicitacoes(
                caronas.stream().map(Carona::getId).toList());
        return caronas.stream().map(c -> {
            CaronaResponse r = toResponse(c);
            List<Solicitacao> aprovadas = solPorCarona.getOrDefault(c.getId(), List.of());
            boolean eParticipante = c.getMotoristaId().equals(solicitanteId)
                    || aprovadas.stream().anyMatch(s -> s.getPassageiroId().equals(solicitanteId));
            int numIntegrantes = aprovadas.size() + 1; // +motorista
            if (!eParticipante) numIntegrantes++;       // +1 viewer como potencial passageiro
            double distTotal = calcularDistanciaTotal(c, aprovadas);
            BigDecimal custoTotalBruto = calcularCustoTotal(distTotal);
            BigDecimal valorPorPessoa = dividirPorIntegrantes(custoTotalBruto, numIntegrantes);
            r.setValorSugerido(valorPorPessoa);
            r.setCustoTotal(valorPorPessoa != null
                    ? valorPorPessoa.multiply(BigDecimal.valueOf(numIntegrantes))
                    : null);
            r.setEParticipante(eParticipante);
            return r;
        }).toList();
    }

    public List<CaronaResponse> listarMinhasProximas(Long motoristaId) {
        List<Carona> caronas = caronaRepository.findUpcomingByMotoristaId(motoristaId, LocalDate.now());
        return comValoresDinamicosDaLista(caronas);
    }

    @Transactional(readOnly = true)
    public List<CaronaResponse> listarMinhasHistorico(Long motoristaId) {
        List<Carona> caronas = caronaRepository.findHistoricoByMotoristaId(motoristaId);
        return comValoresDinamicosDaLista(caronas);
    }

    public Page<CaronaResponse> listarMinhas(Long motoristaId, StatusCarona status, Pageable pageable) {
        Page<Carona> page = status != null
                ? caronaRepository.findByMotoristaIdAndStatusOrderByDataDescHorarioSaidaDesc(motoristaId, status, pageable)
                : caronaRepository.findByMotoristaIdOrderByDataDescHorarioSaidaDesc(motoristaId, pageable);

        List<Long> ids = page.getContent().stream().map(Carona::getId).toList();
        Map<Long, List<Solicitacao>> solPorCarona = batchFetchSolicitacoes(ids);

        return page.map(c -> {
            CaronaResponse r = toResponse(c);
            aplicarValoresDinamicosDaLista(r, c, solPorCarona.getOrDefault(c.getId(), List.of()));
            return r;
        });
    }

    /**
     * Gera a rota otimizada para o motorista com links de navegação.
     * Ordena os passageiros aprovados por proximidade ao ponto de origem.
     */
    public RotaResponse gerarRota(Long caronaId, Long requesterId) {
        Carona c = buscar(caronaId);
        boolean eMotorista = c.getMotoristaId().equals(requesterId);
        boolean ePassageiroAprovado = solicitacaoRepository
                .existsByCaronaIdAndPassageiroIdAndStatusIn(
                        caronaId, requesterId,
                        List.of(StatusSolicitacao.APROVADA, StatusSolicitacao.EMBARCADO, StatusSolicitacao.CONCLUIDA));
        if (!eMotorista && !ePassageiroAprovado)
            throw new BusinessException("Você não tem permissão para ver a rota desta carona.");

        List<Solicitacao> aprovadas = solicitacaoRepository.findAprovadosEEmbarcadosByCaronaId(caronaId);

        // Ordena passageiros aprovados/embarcados por proximidade à origem do motorista (usando coords)
        List<Solicitacao> aprovadosOrdenados = aprovadas.stream()
                .sorted(Comparator.comparingDouble(s -> {
                    if (c.getLatOrigem() == null || s.getLatDestino() == null) return Double.MAX_VALUE;
                    return HaversineUtil.calcular(c.getLatOrigem(), c.getLngOrigem(),
                            s.getLatDestino(), s.getLngDestino());
                }))
                .toList();

        // Link do Google Maps com strings de endereço — mais preciso que coordenadas do Nominatim
        List<String> waypointEnderecos = aprovadosOrdenados.stream()
                .filter(s -> s.getEnderecoDestino() != null && !s.getEnderecoDestino().isBlank())
                .map(Solicitacao::getEnderecoDestino)
                .toList();

        String linkGoogleMaps = (c.getOrigem() != null && c.getDestino() != null)
                ? RotaUtil.gerarLinkGoogleMapsComEnderecos(c.getOrigem(), c.getDestino(), waypointEnderecos)
                : null;

        String linkWaze = c.getLatDestino() != null
                ? RotaUtil.gerarLinkWaze(c.getLatDestino(), c.getLngDestino())
                : null;

        List<RotaResponse.WaypointResponse> waypoints = aprovadosOrdenados.stream()
                .filter(s -> s.getEnderecoDestino() != null)
                .map(s -> RotaResponse.WaypointResponse.builder()
                        .passageiroId(s.getPassageiroId())
                        .endereco(s.getEnderecoDestino())
                        .lat(s.getLatDestino())
                        .lng(s.getLngDestino())
                        .distanciaOrigemKm(c.getLatOrigem() != null && s.getLatDestino() != null
                                ? Math.round(HaversineUtil.calcular(c.getLatOrigem(), c.getLngOrigem(),
                                        s.getLatDestino(), s.getLngDestino()) * 10.0) / 10.0
                                : null)
                        .build())
                .toList();

        return RotaResponse.builder()
                .linkGoogleMaps(linkGoogleMaps)
                .linkWaze(linkWaze)
                .waypoints(waypoints)
                .build();
    }

    /**
     * Busca por endereço livre do passageiro (onde ele está).
     * - IDA   (passageiro quer ir à faculdade): campo livre = origem do passageiro
     *         → compara contra latOrigem da carona (onde o motorista busca passageiros)
     * - VOLTA (passageiro quer sair da faculdade): campo livre = destino do passageiro
     *         → compara contra latDestino da carona (onde o motorista larga passageiros)
     * - null  (sem direção — mostra tudo): usa min(origem, destino)
     */
    private double calcularDistanciaRelevante(Carona c, double lat, double lng, Direcao direcao) {
        boolean temOrigem  = c.getLatOrigem()  != null && c.getLngOrigem()  != null;
        boolean temDestino = c.getLatDestino() != null && c.getLngDestino() != null;

        if (direcao == Direcao.IDA) {
            return temOrigem
                    ? HaversineUtil.calcular(lat, lng, c.getLatOrigem(), c.getLngOrigem())
                    : Double.MAX_VALUE;
        }
        if (direcao == Direcao.VOLTA) {
            return temDestino
                    ? HaversineUtil.calcular(lat, lng, c.getLatDestino(), c.getLngDestino())
                    : Double.MAX_VALUE;
        }
        // sem direção: mínimo entre os dois endpoints
        if (!temOrigem && !temDestino) return Double.MAX_VALUE;
        double dO = temOrigem  ? HaversineUtil.calcular(lat, lng, c.getLatOrigem(),  c.getLngOrigem())  : Double.MAX_VALUE;
        double dD = temDestino ? HaversineUtil.calcular(lat, lng, c.getLatDestino(), c.getLngDestino()) : Double.MAX_VALUE;
        return Math.min(dO, dD);
    }

    private Carona buscar(Long id) {
        return caronaRepository.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Carona"));
    }

    private Carona buscarDoMotorista(Long caronaId, Long motoristaId) {
        Carona c = buscar(caronaId);
        if (!c.getMotoristaId().equals(motoristaId))
            throw new BusinessException("Você não tem permissão sobre esta carona.");
        return c;
    }

    /**
     * Recalcula valorSugerido e custoTotal no response usando dados reais.
     * - Se o userId já é participante (motorista ou aprovado/embarcado): divide pela contagem atual.
     * - Se não é participante: divide por (atual + 1), mostrando o que pagaria SE entrasse.
     * custoTotal = distTotal × 0,75 × 1,3  (combustível 8km/L + 30% margem)
     * valorPorPessoa = custoTotal ÷ numIntegrantes → ceil R$0,50 → mín R$2,00
     */
    private void aplicarValoresDinamicos(CaronaResponse resp, Carona c, Long userId) {
        List<Solicitacao> aprovadas = solicitacaoRepository.findAprovadosEEmbarcadosByCaronaId(c.getId());
        calcularValores(resp, c, aprovadas, userId);
    }

    private void calcularValores(CaronaResponse resp, Carona c,
                                 List<Solicitacao> aprovadas, Long viewerId) {
        boolean eParticipante = c.getMotoristaId().equals(viewerId)
                || aprovadas.stream().anyMatch(s -> s.getPassageiroId().equals(viewerId));

        int numIntegrantes = aprovadas.size() + 1; // +1 motorista
        if (!eParticipante) numIntegrantes++;       // +1 potencial passageiro

        double distTotal = calcularDistanciaTotal(c, aprovadas);
        BigDecimal custoTotalBruto = calcularCustoTotal(distTotal);
        BigDecimal valorPorPessoa = dividirPorIntegrantes(custoTotalBruto, numIntegrantes);
        BigDecimal custoTotal = valorPorPessoa != null
                ? valorPorPessoa.multiply(BigDecimal.valueOf(numIntegrantes))
                : null;

        resp.setCustoTotal(custoTotal);
        resp.setValorSugerido(valorPorPessoa);
        resp.setEParticipante(eParticipante);
    }

    /**
     * Valor que o viewer pagaria SE entrasse na carona.
     * Rota: origem → waypoints existentes + viewer (sorted por dist da origem) → destino.
     * numIntegrantes = passageiros aprovados + 1 motorista + 1 viewer.
     */
    private void aplicarValorComViewer(CaronaResponse resp, Carona c,
                                       List<Solicitacao> aprovadas,
                                       double viewerLat, double viewerLng) {
        if (c.getLatOrigem() == null || c.getLngOrigem() == null
                || c.getLatDestino() == null || c.getLngDestino() == null) return;

        // Monta lista de waypoints: passageiros aprovados + viewer
        List<double[]> waypoints = new ArrayList<>();
        for (Solicitacao s : aprovadas) {
            if (s.getLatDestino() != null && s.getLngDestino() != null)
                waypoints.add(new double[]{s.getLatDestino(), s.getLngDestino()});
        }
        waypoints.add(new double[]{viewerLat, viewerLng});

        // Ordena por distância à origem
        waypoints.sort(Comparator.comparingDouble(wp ->
                HaversineUtil.calcular(c.getLatOrigem(), c.getLngOrigem(), wp[0], wp[1])));

        // Distância cumulativa com waypoints
        double total = 0;
        double lat = c.getLatOrigem(), lng = c.getLngOrigem();
        for (double[] wp : waypoints) {
            total += HaversineUtil.calcular(lat, lng, wp[0], wp[1]);
            lat = wp[0];
            lng = wp[1];
        }
        total += HaversineUtil.calcular(lat, lng, c.getLatDestino(), c.getLngDestino());

        int numIntegrantes = aprovadas.size() + 2; // +motorista +viewer
        BigDecimal custoTotal = calcularCustoTotal(total);
        BigDecimal valorPorPessoa = dividirPorIntegrantes(custoTotal, numIntegrantes);

        resp.setValorSugerido(valorPorPessoa);
        resp.setCustoTotal(custoTotal);
    }

    /** 1 query para todas as solicitações aprovadas/embarcadas de uma lista de caronas. */
    private Map<Long, List<Solicitacao>> batchFetchSolicitacoes(List<Long> caronaIds) {
        if (caronaIds.isEmpty()) return Map.of();
        return solicitacaoRepository.findAprovadosEEmbarcadosByCaronaIds(caronaIds)
                .stream()
                .collect(Collectors.groupingBy(s -> s.getCarona().getId()));
    }

    /** Aplica valorSugerido e custoTotal dinâmicos (sem viewer) — para listas do motorista. */
    private void aplicarValoresDinamicosDaLista(CaronaResponse resp, Carona c, List<Solicitacao> aprovadas) {
        int numIntegrantes = aprovadas.size() + 1; // +motorista
        double distTotal = calcularDistanciaTotal(c, aprovadas);
        BigDecimal custoTotalBruto = calcularCustoTotal(distTotal);
        BigDecimal valorPorPessoa = dividirPorIntegrantes(custoTotalBruto, numIntegrantes);
        resp.setValorSugerido(valorPorPessoa);
        resp.setCustoTotal(valorPorPessoa != null
                ? valorPorPessoa.multiply(BigDecimal.valueOf(numIntegrantes))
                : null);
    }

    /** Mapeia lista de Carona para response com valores dinâmicos (batch-fetch). */
    private List<CaronaResponse> comValoresDinamicosDaLista(List<Carona> caronas) {
        List<Long> ids = caronas.stream().map(Carona::getId).toList();
        Map<Long, List<Solicitacao>> solPorCarona = batchFetchSolicitacoes(ids);
        return caronas.stream().map(c -> {
            CaronaResponse r = toResponse(c);
            aplicarValoresDinamicosDaLista(r, c, solPorCarona.getOrDefault(c.getId(), List.of()));
            return r;
        }).toList();
    }

    /**
     * Distância cumulativa: origem → waypoints (ordenados por dist à origem) → destino.
     * Sem waypoints com coordenadas, retorna distância direta.
     */
    private double calcularDistanciaTotal(Carona c, List<Solicitacao> aprovadas) {
        if (c.getLatOrigem() == null || c.getLngOrigem() == null
                || c.getLatDestino() == null || c.getLngDestino() == null) return 0;

        List<Solicitacao> comCoords = aprovadas.stream()
                .filter(s -> s.getLatDestino() != null && s.getLngDestino() != null)
                .sorted(Comparator.comparingDouble(s -> HaversineUtil.calcular(
                        c.getLatOrigem(), c.getLngOrigem(), s.getLatDestino(), s.getLngDestino())))
                .toList();

        if (comCoords.isEmpty()) {
            return HaversineUtil.calcular(
                    c.getLatOrigem(), c.getLngOrigem(), c.getLatDestino(), c.getLngDestino());
        }

        double total = 0;
        double lat = c.getLatOrigem(), lng = c.getLngOrigem();
        for (Solicitacao s : comCoords) {
            total += HaversineUtil.calcular(lat, lng, s.getLatDestino(), s.getLngDestino());
            lat = s.getLatDestino();
            lng = s.getLngDestino();
        }
        total += HaversineUtil.calcular(lat, lng, c.getLatDestino(), c.getLngDestino());
        return total;
    }

    /** custoTotal = distKm × (R$6,00 / 8km/L) × 1,3 de margem */
    private BigDecimal calcularCustoTotal(double distKm) {
        if (distKm <= 0) return null;
        double custo = distKm * 0.75 * 1.3;
        return BigDecimal.valueOf(custo).setScale(2, RoundingMode.HALF_UP);
    }

    /** valorPorPessoa = custoTotal ÷ integrantes → arredonda R$0,50 → mín R$2,00 */
    private BigDecimal dividirPorIntegrantes(BigDecimal custoTotal, int numIntegrantes) {
        if (custoTotal == null || numIntegrantes <= 0) return null;
        double porPessoa = custoTotal.doubleValue() / numIntegrantes;
        double arredondado = Math.ceil(porPessoa * 2.0) / 2.0;
        double valorFinal = Math.max(arredondado, 2.00);
        return BigDecimal.valueOf(valorFinal).setScale(2, RoundingMode.HALF_UP);
    }

    /** Estimativa inicial ao gerar carona de rotina (motorista + vagas esperadas). */
    private BigDecimal calcularValorSugerido(Rotina rotina) {
        if (rotina.getLatOrigem() == null || rotina.getLngOrigem() == null
                || rotina.getLatDestino() == null || rotina.getLngDestino() == null) {
            return null;
        }
        double distKm = HaversineUtil.calcular(
                rotina.getLatOrigem(), rotina.getLngOrigem(),
                rotina.getLatDestino(), rotina.getLngDestino());
        int vagasEsperadas = rotina.getVagasTotal() != null && rotina.getVagasTotal() > 0
                ? rotina.getVagasTotal() : 0;
        BigDecimal custoTotal = calcularCustoTotal(distKm);
        return dividirPorIntegrantes(custoTotal, vagasEsperadas + 1); // +1 motorista
    }

    public CaronaResponse toResponse(Carona c) {
        CaronaResponse.CaronaResponseBuilder builder = CaronaResponse.builder()
                .id(c.getId())
                .rotinaId(c.getRotinaId())
                .motoristaId(c.getMotoristaId())
                .origem(c.getOrigem()).bairroOrigem(c.getBairroOrigem())
                .destino(c.getDestino()).bairroDestino(c.getBairroDestino())
                .latOrigem(c.getLatOrigem()).lngOrigem(c.getLngOrigem())
                .latDestino(c.getLatDestino()).lngDestino(c.getLngDestino())
                .data(c.getData()).horarioSaida(c.getHorarioSaida())
                .vagasTotal(c.getVagasTotal()).vagasDisponiveis(c.getVagasDisponiveis())
                .valorSugerido(c.getValorSugerido())
                .custoTotal(c.getLatOrigem() != null && c.getLngOrigem() != null
                        && c.getLatDestino() != null && c.getLngDestino() != null
                    ? calcularCustoTotal(HaversineUtil.calcular(
                            c.getLatOrigem(), c.getLngOrigem(),
                            c.getLatDestino(), c.getLngDestino()))
                    : null)
                .status(c.getStatus()).observacoes(c.getObservacoes())
                .nome(c.getNome()).pixKey(c.getPixKey())
                .raioAceito(c.getRaioAceito())
                .direcao(c.getDirecao());

        try {
            var veiculo = userServiceClient.buscarVeiculo(c.getMotoristaId());
            if (veiculo != null) {
                builder.veiculoPlaca(veiculo.getPlaca())
                       .veiculoTipo(veiculo.getTipo())
                       .veiculoMarca(veiculo.getMarca())
                       .veiculoModelo(veiculo.getModelo());
            }
        } catch (Exception e) {
            log.debug("Não foi possível buscar veículo do motorista {}: {}", c.getMotoristaId(), e.getMessage());
        }

        return builder.build();
    }
}
