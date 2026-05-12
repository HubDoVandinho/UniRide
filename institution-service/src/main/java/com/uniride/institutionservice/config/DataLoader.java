package com.uniride.institutionservice.config;

import com.uniride.institutionservice.entity.Instituicao;
import com.uniride.institutionservice.enums.StatusInstituicao;
import com.uniride.institutionservice.repository.InstituicaoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@Profile("dev")
@RequiredArgsConstructor
@Slf4j
public class DataLoader implements CommandLineRunner {

    private final InstituicaoRepository repository;

    @Override
    public void run(String... args) {
        if (repository.count() > 0) return;

        List<Instituicao> instituicoes = List.of(
                // ID 1 — instituição usada pelos usuários de teste (dev)
                Instituicao.builder()
                        .nome("Faculdade Teste UniRide")
                        .sigla("FACULDADE-TESTE")
                        .dominioEmail("faculdade.edu.br")
                        .tipo("Faculdade")
                        .rua("Rua dos Testes")
                        .numero("1")
                        .bairro("Centro")
                        .cidade("São Paulo")
                        .estado("SP")
                        .cep("01000000")
                        .lat(-23.5505).lng(-46.6333)
                        .status(StatusInstituicao.ATIVA)
                        .build(),
                Instituicao.builder()
                        .nome("Faculdade de Tecnologia de Sorocaba")
                        .sigla("FATEC Sorocaba")
                        .dominioEmail("aluno.cps.sp.gov.br")
                        .tipo("Faculdade")
                        .rua("Av. Engenheiro Carlos Reinaldo Mendes")
                        .numero("2015")
                        .bairro("Alto da Boa Vista")
                        .cidade("Sorocaba")
                        .estado("SP")
                        .cep("18013280")
                        .lat(-23.4867).lng(-47.4458)
                        .status(StatusInstituicao.ATIVA)
                        .build(),
                Instituicao.builder()
                        .nome("Universidade Estadual de Campinas")
                        .sigla("UNICAMP")
                        .dominioEmail("unicamp.br")
                        .tipo("Universidade")
                        .rua("Rua Sérgio Buarque de Holanda")
                        .numero("651")
                        .bairro("Cidade Universitária")
                        .cidade("Campinas")
                        .estado("SP")
                        .cep("13083859")
                        .lat(-22.8173).lng(-47.0665)
                        .status(StatusInstituicao.ATIVA)
                        .build(),
                Instituicao.builder()
                        .nome("Pontifícia Universidade Católica de Campinas")
                        .sigla("PUC-Campinas")
                        .dominioEmail("puc-campinas.edu.br")
                        .tipo("Universidade")
                        .rua("Rod. Dom Pedro I")
                        .numero("1069")
                        .bairro("Parque das Universidades")
                        .cidade("Campinas")
                        .estado("SP")
                        .cep("13086900")
                        .lat(-22.8501).lng(-47.0584)
                        .status(StatusInstituicao.ATIVA)
                        .build(),
                Instituicao.builder()
                        .nome("Universidade São Francisco")
                        .sigla("USF")
                        .dominioEmail("usf.edu.br")
                        .tipo("Universidade")
                        .rua("Rua Alexandre Rodrigues Barbosa")
                        .numero("45")
                        .bairro("Centro")
                        .cidade("Itatiba")
                        .estado("SP")
                        .cep("13251900")
                        .lat(-23.0063).lng(-46.8385)
                        .status(StatusInstituicao.ATIVA)
                        .build(),
                Instituicao.builder()
                        .nome("Universidade de São Paulo")
                        .sigla("USP")
                        .dominioEmail("usp.br")
                        .tipo("Universidade")
                        .rua("Rua da Reitoria")
                        .numero("109")
                        .bairro("Cidade Universitária")
                        .cidade("São Paulo")
                        .estado("SP")
                        .cep("05508220")
                        .lat(-23.5623).lng(-46.7255)
                        .status(StatusInstituicao.ATIVA)
                        .build()
        );

        repository.saveAll(instituicoes);
        log.info("✅ DataLoader: {} instituições carregadas.", instituicoes.size());
    }
}