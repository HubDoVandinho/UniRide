package com.uniride.institutionservice.controller;

import com.uniride.institutionservice.dto.request.AtualizarInstituicaoRequest;
import com.uniride.institutionservice.dto.request.CriarInstituicaoRequest;
import com.uniride.institutionservice.dto.response.ApiResponse;
import com.uniride.institutionservice.dto.response.InstituicaoResponse;
import com.uniride.institutionservice.dto.response.ValidacaoDominioResponse;
import com.uniride.institutionservice.service.InstituicaoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/instituicoes")
@RequiredArgsConstructor
public class InstituicaoController {

    private final InstituicaoService service;

    // ─── Endpoints públicos ───────────────────────────────────────────────────

    @GetMapping
    public ResponseEntity<ApiResponse<Page<InstituicaoResponse>>> listar(
            @PageableDefault(size = 20, sort = "nome", direction = Sort.Direction.ASC) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok("Instituições listadas.", service.listarAtivas(pageable)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<InstituicaoResponse>> buscarPorId(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok("Instituição encontrada.", service.buscarPorId(id)));
    }

    @GetMapping("/buscar")
    public ResponseEntity<ApiResponse<Page<InstituicaoResponse>>> buscar(
            @RequestParam String termo,
            @PageableDefault(size = 20, sort = "nome") Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok("Resultado da busca.", service.buscar(termo, pageable)));
    }

    @GetMapping("/cidade/{cidade}")
    public ResponseEntity<ApiResponse<Page<InstituicaoResponse>>> buscarPorCidade(
            @PathVariable String cidade,
            @PageableDefault(size = 20, sort = "nome") Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok("Instituições na cidade.", service.buscarPorCidade(cidade, pageable)));
    }

    @GetMapping("/validar-dominio")
    public ResponseEntity<ApiResponse<ValidacaoDominioResponse>> validarDominio(
            @RequestParam String dominio) {
        ValidacaoDominioResponse resultado = service.validarDominio(dominio);
        String mensagem = resultado.isValido()
                ? "Domínio válido e pertence a uma instituição cadastrada."
                : "Domínio não pertence a nenhuma instituição cadastrada.";
        return ResponseEntity.ok(ApiResponse.ok(mensagem, resultado));
    }

    // ─── Endpoints de Admin ───────────────────────────────────────────────────

    @GetMapping("/admin/todas")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Page<InstituicaoResponse>>> listarTodas(
            @PageableDefault(size = 20, sort = "nome") Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok("Todas as instituições.", service.listarTodas(pageable)));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<InstituicaoResponse>> criar(
            @Valid @RequestBody CriarInstituicaoRequest request) {
        InstituicaoResponse response = service.criar(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Instituição criada com sucesso.", response));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<InstituicaoResponse>> atualizar(
            @PathVariable Long id,
            @Valid @RequestBody AtualizarInstituicaoRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Instituição atualizada.", service.atualizar(id, request)));
    }

    @PatchMapping("/{id}/ativar")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> ativar(@PathVariable Long id) {
        service.ativar(id);
        return ResponseEntity.ok(ApiResponse.ok("Instituição ativada."));
    }

    @PatchMapping("/{id}/desativar")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> desativar(@PathVariable Long id) {
        service.desativar(id);
        return ResponseEntity.ok(ApiResponse.ok("Instituição desativada."));
    }
}
