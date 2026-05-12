package com.uniride.rideservice.controller;

import com.uniride.rideservice.dto.request.MensagemRequest;
import com.uniride.rideservice.dto.response.ApiResponse;
import com.uniride.rideservice.dto.response.MensagemResponse;
import com.uniride.rideservice.security.SecurityUtils;
import com.uniride.rideservice.service.impl.MensagemServiceImpl;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/caronas/{caronaId}/mensagens")
@RequiredArgsConstructor
public class MensagemController {

    private final MensagemServiceImpl service;

    @GetMapping
    public ResponseEntity<ApiResponse<List<MensagemResponse>>> listar(@PathVariable Long caronaId) {
        return ResponseEntity.ok(ApiResponse.ok(service.listar(caronaId, SecurityUtils.getUserId())));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<MensagemResponse>> enviar(
            @PathVariable Long caronaId,
            @Valid @RequestBody MensagemRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Mensagem enviada.",
                        service.enviar(caronaId, SecurityUtils.getUserId(), req)));
    }
}
