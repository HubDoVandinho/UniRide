package com.uniride.rideservice.controller;

import com.uniride.rideservice.dto.request.EmbarcarRequest;
import com.uniride.rideservice.dto.request.SolicitarVagaRequest;
import com.uniride.rideservice.dto.response.ApiResponse;
import com.uniride.rideservice.dto.response.SolicitacaoResponse;
import com.uniride.rideservice.security.SecurityUtils;
import com.uniride.rideservice.service.impl.SolicitacaoServiceImpl;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;

import java.util.List;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class SolicitacaoController {

    private final SolicitacaoServiceImpl service;

    @PostMapping("/caronas/{caronaId}/solicitacoes")
    public ResponseEntity<ApiResponse<SolicitacaoResponse>> solicitar(
            @PathVariable Long caronaId,
            @RequestBody(required = false) SolicitarVagaRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Solicitação enviada. Aguarde a aprovação do motorista.",
                        service.solicitar(caronaId, SecurityUtils.getUserId(), req)));
    }

    @GetMapping("/caronas/{caronaId}/solicitacoes")
    public ResponseEntity<ApiResponse<List<SolicitacaoResponse>>> listarPorCarona(
            @PathVariable Long caronaId) {
        return ResponseEntity.ok(ApiResponse.ok(service.listarPorCarona(caronaId)));
    }

    @GetMapping("/solicitacoes/minhas")
    public ResponseEntity<ApiResponse<List<SolicitacaoResponse>>> listarMinhas() {
        return ResponseEntity.ok(ApiResponse.ok(service.listarMinhas(SecurityUtils.getUserId())));
    }

    @GetMapping("/solicitacoes/recebidas")
    public ResponseEntity<ApiResponse<List<SolicitacaoResponse>>> listarRecebidas() {
        return ResponseEntity.ok(ApiResponse.ok(service.listarRecebidas(SecurityUtils.getUserId())));
    }

    @PutMapping("/solicitacoes/{id}/aprovar")
    public ResponseEntity<ApiResponse<SolicitacaoResponse>> aprovar(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok("Solicitação aprovada.",
                service.aprovar(id, SecurityUtils.getUserId())));
    }

    @PutMapping("/solicitacoes/{id}/recusar")
    public ResponseEntity<ApiResponse<SolicitacaoResponse>> recusar(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok("Solicitação recusada.",
                service.recusar(id, SecurityUtils.getUserId())));
    }

    @PutMapping("/solicitacoes/{id}/embarcar")
    public ResponseEntity<ApiResponse<SolicitacaoResponse>> embarcar(
            @PathVariable Long id,
            @RequestBody EmbarcarRequest req) {
        return ResponseEntity.ok(ApiResponse.ok("Embarque confirmado.",
                service.embarcar(id, SecurityUtils.getUserId(), req.getPin())));
    }

    @PutMapping("/solicitacoes/{id}/nao-compareceu")
    public ResponseEntity<ApiResponse<SolicitacaoResponse>> naoCompareceu(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok("Passageiro marcado como não compareceu. Vaga devolvida.",
                service.naoCompareceu(id, SecurityUtils.getUserId())));
    }

    @GetMapping("/solicitacoes/historico")
    public ResponseEntity<ApiResponse<Page<SolicitacaoResponse>>> historico(
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(
                service.historico(SecurityUtils.getUserId(), pageable)));
    }

    @PatchMapping("/solicitacoes/{id}/confirmar-pagamento")
    public ResponseEntity<ApiResponse<SolicitacaoResponse>> confirmarPagamento(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok("Pagamento confirmado.",
                service.confirmarPagamento(id, SecurityUtils.getUserId())));
    }

    @DeleteMapping("/solicitacoes/{id}")
    public ResponseEntity<ApiResponse<Void>> cancelar(@PathVariable Long id) {
        service.cancelar(id, SecurityUtils.getUserId());
        return ResponseEntity.ok(ApiResponse.ok("Solicitação cancelada."));
    }
}
