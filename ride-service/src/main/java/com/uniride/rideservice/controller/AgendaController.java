package com.uniride.rideservice.controller;

import com.uniride.rideservice.dto.response.ApiResponse;
import com.uniride.rideservice.dto.response.RotinaResponse;
import com.uniride.rideservice.security.SecurityUtils;
import com.uniride.rideservice.service.impl.RotinaServiceImpl;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/participantes")
@RequiredArgsConstructor
public class AgendaController {

    private final RotinaServiceImpl service;

    @GetMapping("/{motoristaId}/agenda")
    public ResponseEntity<ApiResponse<RotinaResponse>> agenda(
            @PathVariable Long motoristaId) {
        Long solicitanteId = SecurityUtils.getUserId();
        // Se chamado sem autenticação (Feign interno), libera
        if (solicitanteId == null) solicitanteId = motoristaId;
        return ResponseEntity.ok(ApiResponse.ok(service.buscarAgenda(motoristaId, solicitanteId)));
    }
}
