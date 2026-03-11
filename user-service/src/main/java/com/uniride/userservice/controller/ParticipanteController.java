package com.uniride.userservice.controller;

import com.uniride.userservice.dto.request.*;
import com.uniride.userservice.dto.response.*;
import com.uniride.userservice.security.JwtService;
import com.uniride.userservice.service.ParticipanteService;
import com.uniride.userservice.service.PromoverMotoristaService;
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
@RequestMapping("/api/v1/participantes")
@RequiredArgsConstructor
public class ParticipanteController {

    private final ParticipanteService       participanteService;
    private final PromoverMotoristaService  promoverMotoristaService;
    private final JwtService                jwtService;

    // ── Cadastro público ──────────────────────────────────────────────────────

    @PostMapping("/passageiros")
    public ResponseEntity<ApiResponse<ParticipanteResponse>> cadastrarPassageiro(
            @Valid @RequestBody CadastroPassageiroRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Passageiro cadastrado com sucesso.",
                        participanteService.cadastrarPassageiro(request)));
    }

    @PostMapping("/motoristas")
    public ResponseEntity<ApiResponse<ParticipanteResponse>> cadastrarMotorista(
            @Valid @RequestBody CadastroMotoristaRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Motorista cadastrado com sucesso.",
                        participanteService.cadastrarMotorista(request)));
    }

    // ── Perfil próprio ────────────────────────────────────────────────────────

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<ParticipanteResponse>> meuPerfil(
            @RequestHeader("Authorization") String bearer) {
        return ResponseEntity.ok(ApiResponse.ok("Perfil carregado.",
                participanteService.buscarPorId(extrairId(bearer))));
    }

    @PutMapping("/me")
    public ResponseEntity<ApiResponse<ParticipanteResponse>> atualizarPerfil(
            @RequestHeader("Authorization") String bearer,
            @Valid @RequestBody AtualizarPerfilRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Perfil atualizado.",
                participanteService.atualizarPerfil(extrairId(bearer), request)));
    }

    @DeleteMapping("/me")
    public ResponseEntity<ApiResponse<Void>> desativarConta(
            @RequestHeader("Authorization") String bearer) {
        participanteService.desativarConta(extrairId(bearer));
        return ResponseEntity.ok(ApiResponse.ok("Conta desativada com sucesso."));
    }

    // ── Promoção para Motorista (opcional, pós-cadastro) ──────────────────────
    //
    // Fluxo: usuário se cadastra como Passageiro → faz login → opcionalmente
    // decide virar Motorista sem precisar criar uma nova conta.
    //
    // Internamente: atualiza dtype via query nativa (SINGLE_TABLE inheritance)
    // e persiste CNH + veículo.
    //
    // ⚠️  Após este endpoint o frontend DEVE chamar POST /auth/refresh para
    //     obter um novo JWT com tipo=MOTORISTA, pois o token atual ainda
    //     carrega tipo=PASSAGEIRO.

    @PostMapping("/me/promover-motorista")
    public ResponseEntity<ApiResponse<ParticipanteResponse>> promoverMotorista(
            @RequestHeader("Authorization") String bearer,
            @Valid @RequestBody PromoverMotoristaRequest request) {
        Long id = extrairId(bearer);
        return ResponseEntity.ok(ApiResponse.ok(
                "Perfil de motorista ativado com sucesso. Faça refresh do token.",
                promoverMotoristaService.promover(id, request)));
    }

    // ── Veículo (apenas MOTORISTA) ────────────────────────────────────────────

    @PostMapping("/me/veiculo")
    @PreAuthorize("hasRole('MOTORISTA')")
    public ResponseEntity<ApiResponse<ParticipanteResponse>> cadastrarVeiculo(
            @RequestHeader("Authorization") String bearer,
            @Valid @RequestBody CadastroVeiculoRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Veículo cadastrado.",
                        participanteService.cadastrarVeiculo(extrairId(bearer), request)));
    }

    @GetMapping("/me/veiculo")
    @PreAuthorize("hasRole('MOTORISTA')")
    public ResponseEntity<ApiResponse<VeiculoResponse>> buscarVeiculo(
            @RequestHeader("Authorization") String bearer) {
        return ResponseEntity.ok(ApiResponse.ok("Veículo encontrado.",
                participanteService.buscarVeiculo(extrairId(bearer))));
    }

    // ── Endereços ─────────────────────────────────────────────────────────────

    @PostMapping("/me/enderecos")
    public ResponseEntity<ApiResponse<EnderecoResponse>> adicionarEndereco(
            @RequestHeader("Authorization") String bearer,
            @Valid @RequestBody EnderecoRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Endereço adicionado.",
                        participanteService.adicionarEndereco(extrairId(bearer), request)));
    }

    @GetMapping("/me/enderecos")
    public ResponseEntity<ApiResponse<List<EnderecoResponse>>> listarEnderecos(
            @RequestHeader("Authorization") String bearer) {
        return ResponseEntity.ok(ApiResponse.ok("Endereços listados.",
                participanteService.listarEnderecos(extrairId(bearer))));
    }

    @DeleteMapping("/me/enderecos/{enderecoId}")
    public ResponseEntity<ApiResponse<Void>> removerEndereco(
            @RequestHeader("Authorization") String bearer,
            @PathVariable Long enderecoId) {
        participanteService.removerEndereco(extrairId(bearer), enderecoId);
        return ResponseEntity.ok(ApiResponse.ok("Endereço removido."));
    }

    // ── Telefones ─────────────────────────────────────────────────────────────

    @PostMapping("/me/telefones")
    public ResponseEntity<ApiResponse<TelefoneResponse>> adicionarTelefone(
            @RequestHeader("Authorization") String bearer,
            @Valid @RequestBody TelefoneRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Telefone adicionado.",
                        participanteService.adicionarTelefone(extrairId(bearer), request)));
    }

    @GetMapping("/me/telefones")
    public ResponseEntity<ApiResponse<List<TelefoneResponse>>> listarTelefones(
            @RequestHeader("Authorization") String bearer) {
        return ResponseEntity.ok(ApiResponse.ok("Telefones listados.",
                participanteService.listarTelefones(extrairId(bearer))));
    }

    @DeleteMapping("/me/telefones/{telefoneId}")
    public ResponseEntity<ApiResponse<Void>> removerTelefone(
            @RequestHeader("Authorization") String bearer,
            @PathVariable Long telefoneId) {
        participanteService.removerTelefone(extrairId(bearer), telefoneId);
        return ResponseEntity.ok(ApiResponse.ok("Telefone removido."));
    }

    // ── Admin ─────────────────────────────────────────────────────────────────

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Page<ParticipanteResponse>>> listar(
            @PageableDefault(size = 20, sort = "criadoEm") Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok("Participantes listados.",
                participanteService.listarTodos(pageable)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<ParticipanteResponse>> buscarPorId(
            @PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok("Participante encontrado.",
                participanteService.buscarPorId(id)));
    }

    // ── Helper ────────────────────────────────────────────────────────────────

    private Long extrairId(String bearer) {
        return jwtService.extrairUserId(bearer.substring(7).trim());
    }
}