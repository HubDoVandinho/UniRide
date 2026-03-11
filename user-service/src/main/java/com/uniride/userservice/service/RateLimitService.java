package com.uniride.userservice.service;

import com.uniride.userservice.config.AppConfig;
import com.uniride.userservice.entity.TentativaLogin;
import com.uniride.userservice.exception.ContaBloqueadaException;
import com.uniride.userservice.repository.TentativaLoginRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class RateLimitService {

    private final TentativaLoginRepository tentativaRepository;
    private final AppConfig appConfig;

    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.REQUIRES_NEW)
    public void registrarTentativa(String email, String ip, boolean sucesso) {
        TentativaLogin tentativa = TentativaLogin.builder()
                .email(email)
                .ipOrigem(ip)
                .sucesso(sucesso)
                .build();
        tentativaRepository.save(tentativa);
    }

    public void verificarBloqueio(String email, String ip) {
        LocalDateTime desde = LocalDateTime.now().minusMinutes(appConfig.getJanelaMinutos());
        int max = appConfig.getMaxTentativas();

        long falhasPorEmail = tentativaRepository.contarFalhasPorEmail(email, desde);
        if (falhasPorEmail >= max) {
            log.warn("Bloqueio por email: {} ({} tentativas)", email, falhasPorEmail);
            throw new ContaBloqueadaException();
        }

        if (ip != null && !ip.isBlank()) {
            long falhasPorIp = tentativaRepository.contarFalhasPorIp(ip, desde);
            if (falhasPorIp >= max * 3L) {
                log.warn("Bloqueio por IP: {} ({} tentativas)", ip, falhasPorIp);
                throw new ContaBloqueadaException();
            }
        }
    }

    // Limpa tentativas antigas toda madrugada às 3h
    @Scheduled(cron = "0 0 3 * * *")
    @Transactional
    public void limparTentativasAntigas() {
        LocalDateTime limite = LocalDateTime.now().minusDays(30);
        tentativaRepository.deleteAll(
                tentativaRepository.findAll().stream()
                        .filter(t -> t.getDataHora().isBefore(limite))
                        .toList()
        );
        log.info("Tentativas de login antigas removidas.");
    }
}