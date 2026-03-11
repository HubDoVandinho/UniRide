package com.uniride.userservice.client;

import com.uniride.userservice.client.dto.InstituicaoClientResponse;
import com.uniride.userservice.client.dto.ValidacaoDominioClientResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;

@FeignClient(name = "institution-service", url = "${institution-service.url}")
public interface InstitutionClient {

    @GetMapping("/api/v1/instituicoes/{id}")
    ApiClientResponse<InstituicaoClientResponse> buscarPorId(@PathVariable Long id);

    @GetMapping("/api/v1/instituicoes/validar-dominio")
    ApiClientResponse<ValidacaoDominioClientResponse> validarDominio(@RequestParam String dominio);
}