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
                Instituicao.builder()
                        .nome("Faculdade de Tecnologia de Sorocaba")
                        .sigla("FATEC Sorocaba")
                        .dominioEmail("fatec.edu.br")
                        .tipo("Faculdade")
                        .rua("Av. Engenheiro Carlos Reinaldo Mendes")
                        .numero("2015")
                        .bairro("Alto da Boa Vista")
                        .cidade("Sorocaba")
                        .estado("SP")
                        .cep("18013280")
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
                        .status(StatusInstituicao.ATIVA)
                        .build()
        );

        repository.saveAll(instituicoes);
        log.info("✅ DataLoader: {} instituições carregadas.", instituicoes.size());
    }
}