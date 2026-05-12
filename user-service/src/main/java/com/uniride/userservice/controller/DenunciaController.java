package com.uniride.userservice.controller;

import com.uniride.userservice.dto.request.CriarDenunciaRequest;
import com.uniride.userservice.dto.request.RevisarDenunciaRequest;
import com.uniride.userservice.dto.response.ApiResponse;
import com.uniride.userservice.dto.response.BloqueioResponse;
import com.uniride.userservice.dto.response.DenunciaResponse;
import com.uniride.userservice.enums.StatusDenuncia;
import com.uniride.userservice.security.JwtService;
import com.uniride.userservice.service.DenunciaService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class DenunciaController {

    private final DenunciaService denunciaService;
    private final JwtService jwtService;

    // ── Usuário autenticado ──────────────────────────────────────────────

    @PostMapping("/api/v1/denuncias")
    public ResponseEntity<ApiResponse<DenunciaResponse>> criar(
            @RequestHeader("Authorization") String bearer,
            @Valid @RequestBody CriarDenunciaRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.ok("Denúncia registrada.", denunciaService.criar(extrairId(bearer), request)));
    }

    @PostMapping("/api/v1/bloqueios/{bloqueadoId}")
    public ResponseEntity<ApiResponse<Void>> bloquear(
            @RequestHeader("Authorization") String bearer,
            @PathVariable Long bloqueadoId) {
        denunciaService.bloquear(extrairId(bearer), bloqueadoId);
        return ResponseEntity.ok(ApiResponse.ok("Usuário bloqueado."));
    }

    @DeleteMapping("/api/v1/bloqueios/{bloqueadoId}")
    public ResponseEntity<ApiResponse<Void>> desbloquear(
            @RequestHeader("Authorization") String bearer,
            @PathVariable Long bloqueadoId) {
        denunciaService.desbloquear(extrairId(bearer), bloqueadoId);
        return ResponseEntity.ok(ApiResponse.ok("Usuário desbloqueado."));
    }

    @GetMapping("/api/v1/bloqueios")
    public ResponseEntity<ApiResponse<List<BloqueioResponse>>> listarBloqueios(
            @RequestHeader("Authorization") String bearer) {
        return ResponseEntity.ok(ApiResponse.ok("Bloqueios listados.",
            denunciaService.listarBloqueios(extrairId(bearer))));
    }

    // ── Admin — denúncias ────────────────────────────────────────────────

    @GetMapping("/api/v1/admin/denuncias")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Page<DenunciaResponse>>> listar(
            @RequestParam(defaultValue = "PENDENTE") StatusDenuncia status,
            @PageableDefault(size = 20, sort = "criadoEm") Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok("Denúncias listadas.",
            denunciaService.listarPorStatus(status, pageable)));
    }

    @GetMapping("/api/v1/admin/denuncias/participante/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Page<DenunciaResponse>>> listarPorParticipante(
            @PathVariable Long id,
            @PageableDefault(size = 20, sort = "criadoEm") Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok("Denúncias do participante.",
            denunciaService.listarPorDenunciado(id, pageable)));
    }

    @PatchMapping("/api/v1/admin/denuncias/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<DenunciaResponse>> revisar(
            @PathVariable Long id,
            @Valid @RequestBody RevisarDenunciaRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Denúncia revisada.", denunciaService.revisar(id, request)));
    }

    private Long extrairId(String bearer) {
        return jwtService.extrairUserId(bearer.substring(7).trim());
    }
}
