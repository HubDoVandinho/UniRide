package com.uniride.institutionservice.client;

import com.uniride.institutionservice.dto.response.EmecIesResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Cliente para a API pública do e-MEC (MEC).
 *
 * URL base configurável em application.yml (emec.api.url).
 * Endpoint de busca: GET ?field=no_ies&value={nome}&take=20&skip=0&sort=no_ies&order=asc
 * Endpoint por código: GET ?field=co_ies&value={codigo}&take=1&skip=0
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class EmecApiClient {

    private final RestTemplate restTemplate;

    @Value("${emec.api.url:https://emec.mec.gov.br/emec/consulta/getIes}")
    private String emecApiUrl;

    public List<EmecIesResponse> buscarPorNome(String nome) {
        String url = UriComponentsBuilder.fromHttpUrl(emecApiUrl)
                .queryParam("field", "no_ies")
                .queryParam("value", nome)
                .queryParam("take", 20)
                .queryParam("skip", 0)
                .queryParam("sort", "no_ies")
                .queryParam("order", "asc")
                .toUriString();

        return executar(url);
    }

    public Optional<EmecIesResponse> buscarPorCodigo(String codigoEmec) {
        String url = UriComponentsBuilder.fromHttpUrl(emecApiUrl)
                .queryParam("field", "co_ies")
                .queryParam("value", codigoEmec)
                .queryParam("take", 1)
                .queryParam("skip", 0)
                .toUriString();

        List<EmecIesResponse> list = executar(url);
        return list.isEmpty() ? Optional.empty() : Optional.of(list.get(0));
    }

    @SuppressWarnings("unchecked")
    private List<EmecIesResponse> executar(String url) {
        try {
            ResponseEntity<Map<String, Object>> resp = restTemplate.exchange(
                    url, HttpMethod.GET, null,
                    new ParameterizedTypeReference<>() {});

            if (resp.getBody() == null) return Collections.emptyList();

            Object listObj = resp.getBody().get("list");
            if (!(listObj instanceof List<?> rawList)) return Collections.emptyList();

            return rawList.stream()
                    .filter(item -> item instanceof Map)
                    .map(item -> {
                        Map<String, Object> m = (Map<String, Object>) item;
                        return EmecIesResponse.builder()
                                .codigoEmec(str(m, "CO_IES"))
                                .nome(str(m, "NO_IES"))
                                .municipio(str(m, "NO_MUNICIPIO"))
                                .uf(str(m, "SG_UF"))
                                .organizacaoAcademica(str(m, "DS_ORGANIZACAO_ACADEMICA"))
                                .situacao(str(m, "DS_SITUACAO"))
                                .build();
                    })
                    .toList();
        } catch (Exception e) {
            log.error("Falha ao consultar e-MEC: url={} erro={}", url, e.getMessage());
            throw new RuntimeException("Serviço e-MEC indisponível: " + e.getMessage(), e);
        }
    }

    private String str(Map<String, Object> m, String key) {
        Object v = m.get(key);
        return v != null ? v.toString().trim() : null;
    }
}
