package com.uniride.rideservice.controller;

import com.uniride.rideservice.dto.request.AvaliacaoRequest;
import com.uniride.rideservice.dto.response.ApiResponse;
import com.uniride.rideservice.dto.response.AvaliacaoResponse;
import com.uniride.rideservice.security.SecurityUtils;
import com.uniride.rideservice.service.impl.AvaliacaoServiceImpl;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/avaliacoes")
@RequiredArgsConstructor
public class AvaliacaoController {

    private final AvaliacaoServiceImpl service;

    @PostMapping
    public ResponseEntity<ApiResponse<AvaliacaoResponse>> avaliar(
            @Valid @RequestBody AvaliacaoRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Avaliação enviada com sucesso.",
                        service.avaliar(req, SecurityUtils.getUserId())));
    }

    @GetMapping("/participantes/{id}")
    public ResponseEntity<ApiResponse<List<AvaliacaoResponse>>> listar(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(service.listarPorParticipante(id)));
    }

    @GetMapping("/participantes/{id}/media")
    public ResponseEntity<ApiResponse<Double>> media(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(service.mediaParticipante(id)));
    }
}
