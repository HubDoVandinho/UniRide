package com.uniride.rideservice.controller;

import com.uniride.rideservice.dto.response.ApiResponse;
import com.uniride.rideservice.dto.response.CaronaResponse;
import com.uniride.rideservice.dto.response.RotaResponse;
import com.uniride.rideservice.enums.Direcao;
import com.uniride.rideservice.enums.StatusCarona;
import com.uniride.rideservice.security.SecurityUtils;
import com.uniride.rideservice.service.impl.CaronaServiceImpl;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/caronas")
@RequiredArgsConstructor
public class CaronaController {

    private final CaronaServiceImpl service;

    @GetMapping("/motorista/{motoristaId}")
    public ResponseEntity<ApiResponse<List<CaronaResponse>>> listarDeMotorista(
            @PathVariable Long motoristaId) {
        return ResponseEntity.ok(ApiResponse.ok(
                service.listarDeMotorista(motoristaId, SecurityUtils.getUserId())));
    }

    @GetMapping("/minhas/proximas")
    public ResponseEntity<ApiResponse<List<CaronaResponse>>> listarMinhasProximas() {
        return ResponseEntity.ok(ApiResponse.ok(
                service.listarMinhasProximas(SecurityUtils.getUserId())));
    }

    @GetMapping("/minhas/historico")
    public ResponseEntity<ApiResponse<List<CaronaResponse>>> listarMinhasHistorico() {
        return ResponseEntity.ok(ApiResponse.ok(
                service.listarMinhasHistorico(SecurityUtils.getUserId())));
    }

    @GetMapping("/mural")
    public ResponseEntity<ApiResponse<Page<CaronaResponse>>> mural(
            @PageableDefault(size = 10, sort = "data") Pageable pageable) {
        Long instituicaoId = SecurityUtils.getInstituicaoId();
        if (instituicaoId == null)
            return ResponseEntity.ok(ApiResponse.ok(Page.empty()));
        return ResponseEntity.ok(ApiResponse.ok(service.listarMural(instituicaoId, pageable)));
    }

    @GetMapping("/buscar")
    public ResponseEntity<ApiResponse<Page<CaronaResponse>>> buscarPorDestino(
            @RequestParam(required = false) Double lat,
            @RequestParam(required = false) Double lng,
            @RequestParam(required = false) Direcao direcao,
            @RequestParam(required = false) List<Long> preferencias,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(
                service.buscarPorProximidade(lat, lng, direcao, SecurityUtils.getUserId(),
                        SecurityUtils.getInstituicaoId(), preferencias, pageable)));
    }

    @GetMapping("/minhas")
    public ResponseEntity<ApiResponse<Page<CaronaResponse>>> listarMinhas(
            @RequestParam(required = false) StatusCarona status,
            @PageableDefault(size = 10, sort = "data", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(
                service.listarMinhas(SecurityUtils.getUserId(), status, pageable)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<CaronaResponse>> buscarPorId(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(service.buscarPorId(id, SecurityUtils.getUserId())));
    }

    @PutMapping("/{id}/iniciar")
    public ResponseEntity<ApiResponse<CaronaResponse>> iniciar(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok("Carona iniciada.",
                service.iniciar(id, SecurityUtils.getUserId())));
    }

    @PutMapping("/{id}/concluir")
    public ResponseEntity<ApiResponse<CaronaResponse>> concluir(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok("Carona concluída.",
                service.concluir(id, SecurityUtils.getUserId())));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> cancelar(@PathVariable Long id) {
        service.cancelar(id, SecurityUtils.getUserId());
        return ResponseEntity.ok(ApiResponse.ok("Carona cancelada."));
    }

    @GetMapping("/{id}/rota")
    public ResponseEntity<ApiResponse<RotaResponse>> gerarRota(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(
                service.gerarRota(id, SecurityUtils.getUserId())));
    }
}
