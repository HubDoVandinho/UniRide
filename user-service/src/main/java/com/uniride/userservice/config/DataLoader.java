package com.uniride.userservice.config;

import com.uniride.userservice.entity.Admin;
import com.uniride.userservice.entity.Amizade;
import com.uniride.userservice.entity.Motorista;
import com.uniride.userservice.entity.Passageiro;
import com.uniride.userservice.entity.TipoPreferencia;
import com.uniride.userservice.enums.StatusAmizade;
import com.uniride.userservice.enums.StatusParticipante;
import com.uniride.userservice.repository.AmizadeRepository;
import com.uniride.userservice.repository.ParticipanteRepository;
import com.uniride.userservice.repository.TipoPreferenciaRepository;
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
    private final TipoPreferenciaRepository tipoPreferenciaRepository;
    private final AmizadeRepository amizadeRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        seedTiposPreferencia();

        if (participanteRepository.findByEmailPessoal("admin@uniride.com").isPresent()) return;

        Admin admin = new Admin();
        admin.setNome("Administrador UniRide");
        admin.setUsername("admin");
        admin.setEmailPessoal("admin@uniride.com");
        admin.setEmailInstitucional("admin@uniride.internal"); // domínio interno — não requer validação
        admin.setCpf("00000000000");
        admin.setSenhaHash(passwordEncoder.encode("Admin@1234"));
        admin.setStatus(StatusParticipante.ATIVO);
        admin.setVerificado(true);

        participanteRepository.save(admin);
        log.info("Admin criado: email=admin@uniride.com, senha=Admin@1234");

        if (participanteRepository.findByEmailPessoal("passageiro@teste.com").isEmpty()) {
            Passageiro passageiro = new Passageiro();
            passageiro.setNome("Passageiro Teste");
            passageiro.setUsername("passageiro.teste");
            passageiro.setEmailPessoal("passageiro@teste.com");
            passageiro.setEmailInstitucional("passageiro@aluno.cps.sp.gov.br");
            passageiro.setCpf("11111111111");
            passageiro.setSenhaHash(passwordEncoder.encode("Teste@1234"));
            passageiro.setStatus(StatusParticipante.ATIVO);
            passageiro.setVerificado(true);
            passageiro.setInstituicaoId(2L); // FATEC Sorocaba (ID 2 no institution-service)
            passageiro.setTotalCaronasSolicitadas(0);
            participanteRepository.save(passageiro);
            log.info("Passageiro de teste criado: email=passageiro@teste.com, senha=Teste@1234");
        }

        if (participanteRepository.findByEmailPessoal("motorista@teste.com").isEmpty()) {
            Motorista motorista = new Motorista();
            motorista.setNome("Motorista Teste");
            motorista.setUsername("motorista.teste");
            motorista.setEmailPessoal("motorista@teste.com");
            motorista.setEmailInstitucional("motorista@aluno.cps.sp.gov.br");
            motorista.setCpf("22222222222");
            motorista.setSenhaHash(passwordEncoder.encode("Teste@1234"));
            motorista.setStatus(StatusParticipante.ATIVO);
            motorista.setVerificado(true);
            motorista.setCnh("12345678901");
            motorista.setAprovadoAdmin(true);
            motorista.setInstituicaoId(2L); // FATEC Sorocaba (ID 2 no institution-service)
            motorista.setTotalCaronasOferecidas(0);
            participanteRepository.save(motorista);
            log.info("Motorista de teste criado: email=motorista@teste.com, senha=Teste@1234");
        }

        // Motorista pendente de aprovação admin (para testar o painel admin)
        if (participanteRepository.findByEmailPessoal("motorista2@teste.com").isEmpty()) {
            Motorista motoristaPendente = new Motorista();
            motoristaPendente.setNome("Motorista Pendente");
            motoristaPendente.setUsername("motorista.pendente");
            motoristaPendente.setEmailPessoal("motorista2@teste.com");
            motoristaPendente.setEmailInstitucional("motorista2@aluno.cps.sp.gov.br");
            motoristaPendente.setCpf("33333333333");
            motoristaPendente.setSenhaHash(passwordEncoder.encode("Teste@1234"));
            motoristaPendente.setStatus(StatusParticipante.ATIVO);
            motoristaPendente.setVerificado(true);
            motoristaPendente.setCnh("98765432100");
            motoristaPendente.setAprovadoAdmin(false); // aguardando aprovação
            motoristaPendente.setInstituicaoId(2L);
            motoristaPendente.setTotalCaronasOferecidas(0);
            participanteRepository.save(motoristaPendente);
            log.info("Motorista pendente criado (admin panel test): email=motorista2@teste.com, senha=Teste@1234");
        }

        // Amizade aceita entre passageiro (id=2) e motorista (id=3)
        participanteRepository.findByEmailPessoal("passageiro@teste.com").ifPresent(passageiro ->
            participanteRepository.findByEmailPessoal("motorista@teste.com").ifPresent(motorista -> {
                if (amizadeRepository.count() == 0) {
                    Amizade amizade = new Amizade();
                    amizade.setSolicitante(passageiro);
                    amizade.setDestinatario(motorista);
                    amizade.setStatus(StatusAmizade.ACEITA);
                    amizadeRepository.save(amizade);
                    log.info("Amizade de teste criada: passageiro ↔ motorista (ACEITA)");
                }
            })
        );
    }

    private void seedTiposPreferencia() {
        if (tipoPreferenciaRepository.count() > 0) return;

        record Tipo(String nome, String descricao, String destinatario) {}
        var tipos = java.util.List.of(
                // Preferências de MOTORISTA (o que o motorista oferece/aceita)
                new Tipo("Música no carro",    "Costumo ouvir música durante a viagem",          "MOTORISTA"),
                new Tipo("Pet friendly",       "Aceito animais de estimação no carro",            "MOTORISTA"),
                new Tipo("Sem cigarro",        "Não fumo e prefiro que não fumem no carro",       "MOTORISTA"),
                new Tipo("Aceito bagagem",     "Tenho espaço para bagagens maiores",              "MOTORISTA"),
                new Tipo("Ar-condicionado",    "O carro tem ar-condicionado",                     "MOTORISTA"),
                // Preferências de PASSAGEIRO (o que o passageiro prefere como viajante)
                new Tipo("Sem conversa",       "Prefiro silêncio durante a viagem",               "PASSAGEIRO"),
                new Tipo("Gosto de conversar", "Adoro bater papo no trajeto",                     "PASSAGEIRO"),
                new Tipo("Sem música",         "Prefiro a viagem sem música",                     "PASSAGEIRO"),
                // Comuns (aparecem para ambos)
                new Tipo("Pontualidade",       "Priorizo horários rigorosos de saída",            "AMBOS"),
                new Tipo("Só para mulheres",   "Prefiro caronas somente entre mulheres",          "AMBOS")
        );

        tipos.forEach(t -> tipoPreferenciaRepository.save(
                TipoPreferencia.builder().nome(t.nome()).descricao(t.descricao()).ativo(true).destinatario(t.destinatario()).build()
        ));

        log.info("Tipos de preferência criados: total={}", tipos.size());
    }
}