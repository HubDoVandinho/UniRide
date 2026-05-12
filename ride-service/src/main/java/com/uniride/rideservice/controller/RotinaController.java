package com.uniride.rideservice.controller;

import com.uniride.rideservice.dto.request.AtualizarRotinaRequest;
import com.uniride.rideservice.dto.request.CriarRotinaRequest;
import com.uniride.rideservice.dto.response.ApiResponse;
import com.uniride.rideservice.dto.response.CaronaResponse;
import com.uniride.rideservice.dto.response.RotinaResponse;
import com.uniride.rideservice.entity.Rotina;
import com.uniride.rideservice.exception.RecursoNaoEncontradoException;
import com.uniride.rideservice.security.SecurityUtils;
import com.uniride.rideservice.service.impl.CaronaServiceImpl;
import com.uniride.rideservice.service.impl.RotinaServiceImpl;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/rotinas")
@RequiredArgsConstructor
public class RotinaController {

    private final RotinaServiceImpl service;
    private final CaronaServiceImpl caronaService;

    @PostMapping
    public ResponseEntity<ApiResponse<RotinaResponse>> criar(
            @Valid @RequestBody CriarRotinaRequest req) {
        Long userId        = SecurityUtils.getUserId();
        Long instituicaoId = SecurityUtils.getInstituicaoId();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Rotina criada com sucesso.",
                        service.criar(req, userId, instituicaoId)));
    }

    @PostMapping("/{id}/caronas")
    public ResponseEntity<ApiResponse<CaronaResponse>> gerarCarona(
            @PathVariable Long id,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate data) {
        Long userId        = SecurityUtils.getUserId();
        Long instituicaoId = SecurityUtils.getInstituicaoId();
        Rotina rotina = service.buscarRotina(id, userId);
        LocalDate dataCarona = data != null ? data : LocalDate.now().plusDays(1);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Carona gerada com sucesso.",
                        caronaService.gerarDeRotina(rotina, userId, instituicaoId, dataCarona)));
    }

    @GetMapping("/minhas")
    public ResponseEntity<ApiResponse<List<RotinaResponse>>> listarMinhas() {
        return ResponseEntity.ok(ApiResponse.ok(service.listarMinhas(SecurityUtils.getUserId())));
    }

    @GetMapping("/buscar")
    public ResponseEntity<ApiResponse<Page<RotinaResponse>>> buscarPorProximidade(
            @RequestParam Double lat,
            @RequestParam Double lng,
            @RequestParam(defaultValue = "5.0") Double raio,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(
                service.buscarPorProximidade(lat, lng, raio, SecurityUtils.getUserId(), pageable)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<RotinaResponse>> atualizar(
            @PathVariable Long id,
            @Valid @RequestBody AtualizarRotinaRequest req) {
        return ResponseEntity.ok(ApiResponse.ok("Rotina atualizada.",
                service.atualizar(id, req, SecurityUtils.getUserId())));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> excluir(
            @PathVariable Long id,
            @RequestParam(defaultValue = "false") boolean cancelarCaronas) {
        service.excluir(id, SecurityUtils.getUserId(), cancelarCaronas);
        return ResponseEntity.ok(ApiResponse.ok("Rotina excluída."));
    }
}
