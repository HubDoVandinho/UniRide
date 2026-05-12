package com.uniride.rideservice.config;

import com.uniride.rideservice.entity.Carona;
import com.uniride.rideservice.entity.Rotina;
import com.uniride.rideservice.enums.DiaSemana;
import com.uniride.rideservice.enums.StatusRotina;
import com.uniride.rideservice.repository.CaronaRepository;
import com.uniride.rideservice.repository.RotinaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class CaronaScheduler {

    private final RotinaRepository rotinaRepository;
    private final CaronaRepository caronaRepository;

    private static final Map<DiaSemana, DayOfWeek> DIA_MAP = Map.of(
            DiaSemana.SEG, DayOfWeek.MONDAY,
            DiaSemana.TER, DayOfWeek.TUESDAY,
            DiaSemana.QUA, DayOfWeek.WEDNESDAY,
            DiaSemana.QUI, DayOfWeek.THURSDAY,
            DiaSemana.SEX, DayOfWeek.FRIDAY,
            DiaSemana.SAB, DayOfWeek.SATURDAY,
            DiaSemana.DOM, DayOfWeek.SUNDAY
    );

    /**
     * Todo domingo à meia-noite gera as caronas da semana seguinte.
     */
    @Scheduled(cron = "0 0 0 * * SUN")
    @Transactional
    public void gerarCaronasSemanaSeginte() {
        LocalDate inicio = LocalDate.now().plusDays(1); // Segunda
        LocalDate fim    = inicio.plusDays(6);          // Domingo

        log.info("Gerando caronas de {} a {}", inicio, fim);

        List<Rotina> rotinas = rotinaRepository
                .findByStatusAndDataFimIsNullOrStatusAndDataFimGreaterThanEqual(
                        StatusRotina.ATIVA, StatusRotina.ATIVA, inicio);

        int geradas = 0;
        for (Rotina rotina : rotinas) {
            for (DiaSemana dia : rotina.getDiasDaSemana()) {
                LocalDate data = proximaOcorrencia(inicio, DIA_MAP.get(dia));
                if (data != null && !data.isAfter(fim)) {
                    if (!caronaRepository.existsAtivaPorRotinaEData(rotina.getId(), data)) {
                        caronaRepository.save(criarCarona(rotina, data));
                        geradas++;
                    }
                }
            }
        }
        log.info("Geradas {} caronas para a semana.", geradas);
    }

    /**
     * Para testes — gera caronas da semana atual ao iniciar.
     */
    @Scheduled(initialDelay = 5000, fixedDelay = Long.MAX_VALUE)
    @Transactional
    public void gerarCaronasHoje() {
        LocalDate hoje = LocalDate.now();
        LocalDate fim  = hoje.plusDays(7);

        List<Rotina> rotinas = rotinaRepository
                .findByStatusAndDataFimIsNullOrStatusAndDataFimGreaterThanEqual(
                        StatusRotina.ATIVA, StatusRotina.ATIVA, hoje);

        int geradas = 0;
        for (Rotina rotina : rotinas) {
            for (DiaSemana dia : rotina.getDiasDaSemana()) {
                for (LocalDate d = hoje; !d.isAfter(fim); d = d.plusDays(1)) {
                    if (d.getDayOfWeek() == DIA_MAP.get(dia)) {
                        if (!caronaRepository.existsAtivaPorRotinaEData(rotina.getId(), d)) {
                            caronaRepository.save(criarCarona(rotina, d));
                            geradas++;
                        }
                    }
                }
            }
        }
        if (geradas > 0) log.info("Geradas {} caronas iniciais.", geradas);
    }

    private Carona criarCarona(Rotina rotina, LocalDate data) {
        Carona c = new Carona();
        c.setRotinaId(rotina.getId());
        c.setMotoristaId(rotina.getMotoristaId());
        c.setInstituicaoId(rotina.getInstituicaoId());
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
        c.setVagasTotal(rotina.getVagasTotal());
        c.setVagasDisponiveis(rotina.getVagasTotal());
        c.setValorSugerido(rotina.getValorSugerido());
        c.setRaioAceito(rotina.getRaioAceito());
        c.setObservacoes(rotina.getObservacoes());
        c.setDirecao(rotina.getDirecao());
        return c;
    }

    private LocalDate proximaOcorrencia(LocalDate from, DayOfWeek diaSemana) {
        LocalDate d = from;
        for (int i = 0; i < 7; i++) {
            if (d.getDayOfWeek() == diaSemana) return d;
            d = d.plusDays(1);
        }
        return null;
    }
}
