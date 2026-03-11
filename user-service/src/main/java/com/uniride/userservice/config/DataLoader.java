package com.uniride.userservice.config;

import com.uniride.userservice.entity.Admin;
import com.uniride.userservice.enums.StatusParticipante;
import com.uniride.userservice.repository.ParticipanteRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@Profile("dev")
@RequiredArgsConstructor
@Slf4j
public class DataLoader implements CommandLineRunner {

    private final ParticipanteRepository participanteRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        if (participanteRepository.findByEmail("admin@uniride.com").isPresent()) return;

        Admin admin = new Admin();
        admin.setNome("Administrador UniRide");
        admin.setEmail("admin@uniride.com");
        admin.setCpf("00000000000");
        admin.setSenhaHash(passwordEncoder.encode("Admin@1234"));
        admin.setStatus(StatusParticipante.ATIVO);
        admin.setVerificado(true);

        participanteRepository.save(admin);
        log.info("✅ Admin criado: email=admin@uniride.com, senha=Admin@1234");
    }
}