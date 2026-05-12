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

/**
 * Gera automaticamente as caronas do dia seguinte todo dia às 22h.
 * Para cada rotina ATIVA cuja lista de diasDaSemana inclua o dia de amanhã,
 * cria uma carona se ainda não existir uma para aquela data.
 *
 * O cron pode ser sobrescrito via propriedade: uniride.scheduler.cron
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class RotinaScheduler {
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

    @Scheduled(cron = "${uniride.scheduler.cron:0 0 22 * * *}")
    @Transactional
    public void gerarCaronasParaAmanha() {
        LocalDate amanha = LocalDate.now().plusDays(1);
        DayOfWeek diaDeSemanaAmanha = amanha.getDayOfWeek();

        log.info("RotinaScheduler: gerando caronas para {}", amanha);

        List<Rotina> rotinas = rotinaRepository
                .findByStatusAndDataFimIsNullOrStatusAndDataFimGreaterThanEqual(
                        StatusRotina.ATIVA, StatusRotina.ATIVA, amanha);

        int geradas = 0;
        for (Rotina rotina : rotinas) {
            boolean diaCompativel = rotina.getDiasDaSemana().stream()
                    .anyMatch(d -> DIA_MAP.get(d) == diaDeSemanaAmanha);
            if (!diaCompativel) continue;
            if (caronaRepository.existsAtivaPorRotinaEData(rotina.getId(), amanha)) continue;

            caronaRepository.save(criarCarona(rotina, amanha));
            geradas++;
        }
        log.info("RotinaScheduler: {} carona(s) gerada(s) para {}.", geradas, amanha);
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
}
