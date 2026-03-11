package com.uniride.userservice.controller;

import com.uniride.userservice.dto.response.AmizadeResponse;
import com.uniride.userservice.dto.response.ApiResponse;
import com.uniride.userservice.dto.response.PerfilPublicoResponse;
import com.uniride.userservice.dto.response.SaoAmigosResponse;
import com.uniride.userservice.security.JwtService;
import com.uniride.userservice.service.AmizadeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class AmizadeController {

    private final AmizadeService amizadeService;
    private final JwtService     jwtService;

    // ── Solicitações ──────────────────────────────────────────────────────────

    /**
     * POST /api/v1/amizades/{destinatarioId}
     * Envia solicitação de amizade para outro participante.
     */
    @PostMapping("/api/v1/amizades/{destinatarioId}")
    public ResponseEntity<ApiResponse<AmizadeResponse>> enviarSolicitacao(
            @RequestHeader("Authorization") String bearer,
            @PathVariable Long destinatarioId) {
        Long meuId = extrairId(bearer);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Solicitação enviada.",
                        amizadeService.enviarSolicitacao(meuId, destinatarioId)));
    }

    /**
     * PUT /api/v1/amizades/{id}/aceitar
     */
    @PutMapping("/api/v1/amizades/{id}/aceitar")
    public ResponseEntity<ApiResponse<AmizadeResponse>> aceitar(
            @RequestHeader("Authorization") String bearer,
            @PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok("Amizade aceita.",
                amizadeService.aceitar(id, extrairId(bearer))));
    }

    /**
     * PUT /api/v1/amizades/{id}/recusar
     */
    @PutMapping("/api/v1/amizades/{id}/recusar")
    public ResponseEntity<ApiResponse<AmizadeResponse>> recusar(
            @RequestHeader("Authorization") String bearer,
            @PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok("Solicitação recusada.",
                amizadeService.recusar(id, extrairId(bearer))));
    }

    /**
     * PUT /api/v1/amizades/{id}/bloquear
     */
    @PutMapping("/api/v1/amizades/{id}/bloquear")
    public ResponseEntity<ApiResponse<AmizadeResponse>> bloquear(
            @RequestHeader("Authorization") String bearer,
            @PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok("Usuário bloqueado.",
                amizadeService.bloquear(id, extrairId(bearer))));
    }

    /**
     * DELETE /api/v1/amizades/{id}
     * Remove amizade aceita (desfazer amizade).
     */
    @DeleteMapping("/api/v1/amizades/{id}")
    public ResponseEntity<ApiResponse<Void>> remover(
            @RequestHeader("Authorization") String bearer,
            @PathVariable Long id) {
        amizadeService.remover(id, extrairId(bearer));
        return ResponseEntity.ok(ApiResponse.ok("Amizade removida."));
    }

    // ── Listagens ─────────────────────────────────────────────────────────────

    /**
     * GET /api/v1/amizades
     * Lista todos os amigos aceitos do usuário autenticado.
     */
    @GetMapping("/api/v1/amizades")
    public ResponseEntity<ApiResponse<List<AmizadeResponse>>> listarAmigos(
            @RequestHeader("Authorization") String bearer) {
        return ResponseEntity.ok(ApiResponse.ok("Amigos listados.",
                amizadeService.listarAmigos(extrairId(bearer))));
    }

    /**
     * GET /api/v1/amizades/pendentes
     * Lista solicitações recebidas e aguardando resposta.
     */
    @GetMapping("/api/v1/amizades/pendentes")
    public ResponseEntity<ApiResponse<List<AmizadeResponse>>> listarPendentes(
            @RequestHeader("Authorization") String bearer) {
        return ResponseEntity.ok(ApiResponse.ok("Solicitações pendentes.",
                amizadeService.listarPendentesRecebidas(extrairId(bearer))));
    }

    /**
     * GET /api/v1/amizades/enviadas
     * Lista solicitações que o usuário enviou e ainda estão pendentes.
     */
    @GetMapping("/api/v1/amizades/enviadas")
    public ResponseEntity<ApiResponse<List<AmizadeResponse>>> listarEnviadas(
            @RequestHeader("Authorization") String bearer) {
        return ResponseEntity.ok(ApiResponse.ok("Solicitações enviadas.",
                amizadeService.listarPendentesEnviadas(extrairId(bearer))));
    }

    // ── Perfil público e sugestões ────────────────────────────────────────────

    /**
     * GET /api/v1/participantes/{id}/perfil
     * Perfil público de qualquer participante (nome, foto, instituição, avaliação).
     */
    @GetMapping("/api/v1/participantes/{id}/perfil")
    public ResponseEntity<ApiResponse<PerfilPublicoResponse>> perfilPublico(
            @PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok("Perfil encontrado.",
                amizadeService.buscarPerfilPublico(id)));
    }

    /**
     * GET /api/v1/participantes/instituicao/sugestoes
     * Sugere participantes da mesma instituição que ainda não são amigos.
     */
    @GetMapping("/api/v1/participantes/instituicao/sugestoes")
    public ResponseEntity<ApiResponse<List<PerfilPublicoResponse>>> sugestoes(
            @RequestHeader("Authorization") String bearer) {
        return ResponseEntity.ok(ApiResponse.ok("Sugestões listadas.",
                amizadeService.sugestoesDaInstituicao(extrairId(bearer))));
    }

    // ── Feign Client (ride-service) ───────────────────────────────────────────

    /**
     * GET /api/v1/amizades/sao-amigos?a={idA}&b={idB}
     * Usado internamente pelo ride-service para checar visibilidade de caronas.
     * Não requer Authorization header — validado pelo gateway via X-User-Id.
     */
    @GetMapping("/api/v1/amizades/sao-amigos")
    public ResponseEntity<SaoAmigosResponse> saoAmigos(
            @RequestParam Long a,
            @RequestParam Long b) {
        return ResponseEntity.ok(amizadeService.verificarAmizade(a, b));
    }

    // ── Helper ────────────────────────────────────────────────────────────────

    private Long extrairId(String bearer) {
        return jwtService.extrairUserId(bearer.substring(7).trim());
    }
}
