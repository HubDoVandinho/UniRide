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

    @GetMapping("/verificar-username")
    public ResponseEntity<ApiResponse<java.util.Map<String, Boolean>>> verificarUsername(
            @RequestParam String username) {
        boolean disponivel = participanteService.usernameDisponivel(username.toLowerCase().trim());
        return ResponseEntity.ok(ApiResponse.ok(
                disponivel ? "Username disponível." : "Username já está em uso.",
                java.util.Map.of("disponivel", disponivel)));
    }

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

    @DeleteMapping("/me/conta")
    public ResponseEntity<ApiResponse<Void>> apagarConta(
            @RequestHeader("Authorization") String bearer,
            @Valid @RequestBody ApagarContaRequest request) {
        participanteService.apagarConta(extrairId(bearer), request.getSenha());
        return ResponseEntity.ok(ApiResponse.ok("Conta apagada permanentemente."));
    }

    @PatchMapping("/me/foto-perfil")
    public ResponseEntity<ApiResponse<ParticipanteResponse>> atualizarFotoPerfil(
            @RequestHeader("Authorization") String bearer,
            @RequestParam String url) {
        return ResponseEntity.ok(ApiResponse.ok("Foto de perfil atualizada.",
                participanteService.atualizarFotoPerfil(extrairId(bearer), url)));
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

    @PutMapping("/me/promover-motorista")
    public ResponseEntity<ApiResponse<ParticipanteResponse>> promoverMotorista(
            @RequestHeader("Authorization") String bearer,
            @Valid @RequestBody PromoverMotoristaRequest request) {
        Long id = extrairId(bearer);
        return ResponseEntity.ok(ApiResponse.ok(
                "Perfil de motorista ativado com sucesso. Faça refresh do token.",
                promoverMotoristaService.promover(id, request)));
    }

    // ── Veículo (apenas MOTORISTA) ────────────────────────────────────────────

    @PostMapping("/me/veiculos")
    @PreAuthorize("hasRole('MOTORISTA')")
    public ResponseEntity<ApiResponse<ParticipanteResponse>> cadastrarVeiculo(
            @RequestHeader("Authorization") String bearer,
            @Valid @RequestBody CadastroVeiculoRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Veículo cadastrado.",
                        participanteService.cadastrarVeiculo(extrairId(bearer), request)));
    }

    @GetMapping("/me/veiculos")
    @PreAuthorize("hasRole('MOTORISTA')")
    public ResponseEntity<ApiResponse<List<VeiculoResponse>>> listarVeiculos(
            @RequestHeader("Authorization") String bearer) {
        return ResponseEntity.ok(ApiResponse.ok("Veículos listados.",
                participanteService.listarVeiculos(extrairId(bearer))));
    }

    @PutMapping("/me/veiculos/{veiculoId}")
    @PreAuthorize("hasRole('MOTORISTA')")
    public ResponseEntity<ApiResponse<ParticipanteResponse>> atualizarVeiculo(
            @RequestHeader("Authorization") String bearer,
            @PathVariable Long veiculoId,
            @Valid @RequestBody CadastroVeiculoRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Veículo atualizado.",
                participanteService.atualizarVeiculo(extrairId(bearer), veiculoId, request)));
    }

    @DeleteMapping("/me/veiculos/{veiculoId}")
    @PreAuthorize("hasRole('MOTORISTA')")
    public ResponseEntity<ApiResponse<Void>> removerVeiculo(
            @RequestHeader("Authorization") String bearer,
            @PathVariable Long veiculoId) {
        participanteService.removerVeiculo(extrairId(bearer), veiculoId);
        return ResponseEntity.ok(ApiResponse.ok("Veículo removido."));
    }

    /** GET /me/veiculo — mantido para Feign (ride-service): retorna o primeiro veículo */
    @GetMapping("/me/veiculo")
    @PreAuthorize("hasRole('MOTORISTA')")
    public ResponseEntity<ApiResponse<VeiculoResponse>> buscarVeiculo(
            @RequestHeader("Authorization") String bearer) {
        return ResponseEntity.ok(ApiResponse.ok("Veículo encontrado.",
                participanteService.buscarVeiculo(extrairId(bearer))));
    }

    /**
     * GET /api/v1/participantes/{id}/veiculo-info
     * Endpoint interno para o ride-service validar capacidade via Feign.
     * Retorna sem wrapper ApiResponse para facilitar deserialização.
     */
    @GetMapping("/{id}/veiculo-info")
    public ResponseEntity<VeiculoResponse> veiculoInfo(@PathVariable Long id) {
        return ResponseEntity.ok(participanteService.buscarVeiculo(id));
    }

    /**
     * PATCH /api/v1/participantes/{id}/media-avaliacoes
     * Endpoint interno chamado pelo ride-service via Feign após cada avaliação.
     * Atualiza o campo desnormalizado mediaAvaliacoes no perfil do participante.
     */
    @PatchMapping("/{id}/media-avaliacoes")
    public ResponseEntity<Void> atualizarMediaAvaliacoes(
            @PathVariable Long id,
            @RequestParam Double media) {
        participanteService.atualizarMediaAvaliacoes(id, media);
        return ResponseEntity.noContent().build();
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

    // ── Preferências ─────────────────────────────────────────────────────────

    @GetMapping("/me/preferencias")
    public ResponseEntity<ApiResponse<List<TipoPreferenciaResponse>>> listarPreferencias(
            @RequestHeader("Authorization") String bearer) {
        return ResponseEntity.ok(ApiResponse.ok("Preferências listadas.",
                participanteService.listarPreferencias(extrairId(bearer))));
    }

    @PutMapping("/me/preferencias")
    public ResponseEntity<ApiResponse<Void>> atualizarPreferencias(
            @RequestHeader("Authorization") String bearer,
            @RequestBody List<Long> tipoIds) {
        participanteService.atualizarPreferencias(extrairId(bearer), tipoIds);
        return ResponseEntity.ok(ApiResponse.ok("Preferências atualizadas."));
    }

    @PostMapping("/me/preferencias/custom")
    public ResponseEntity<ApiResponse<TipoPreferenciaResponse>> criarPreferenciaCustom(
            @RequestHeader("Authorization") String bearer,
            @RequestBody String nome) {
        TipoPreferenciaResponse criada = participanteService.criarPreferenciaCustom(extrairId(bearer), nome);
        return ResponseEntity.ok(ApiResponse.ok("Preferência criada.", criada));
    }

    @DeleteMapping("/me/preferencias/custom/{tipoId}")
    public ResponseEntity<ApiResponse<Void>> deletarPreferenciaCustom(
            @RequestHeader("Authorization") String bearer,
            @PathVariable Long tipoId) {
        participanteService.deletarPreferenciaCustom(extrairId(bearer), tipoId);
        return ResponseEntity.ok(ApiResponse.ok("Preferência removida."));
    }

    // ── Admin ─────────────────────────────────────────────────────────────────

    @PatchMapping("/{id}/ativar")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> ativar(@PathVariable Long id) {
        participanteService.ativarConta(id);
        return ResponseEntity.ok(ApiResponse.ok("Conta ativada com sucesso."));
    }

    @PatchMapping("/{id}/suspender")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> suspender(@PathVariable Long id) {
        participanteService.suspenderConta(id);
        return ResponseEntity.ok(ApiResponse.ok("Conta suspensa."));
    }

    @PatchMapping("/{id}/dessuspender")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> dessuspender(@PathVariable Long id) {
        participanteService.dessuspenderConta(id);
        return ResponseEntity.ok(ApiResponse.ok("Conta reativada."));
    }

    @PatchMapping("/{id}/verificar")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> verificar(@PathVariable Long id) {
        participanteService.verificarParticipante(id);
        return ResponseEntity.ok(ApiResponse.ok("Participante verificado."));
    }

    @PatchMapping("/{id}/desverificar")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> desverificar(@PathVariable Long id) {
        participanteService.desverificarParticipante(id);
        return ResponseEntity.ok(ApiResponse.ok("Verificação removida."));
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Page<ParticipanteResponse>>> listar(
            @PageableDefault(size = 20, sort = "criadoEm") Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok("Participantes listados.",
                participanteService.listarTodos(pageable)));
    }

    @GetMapping("/admin/motoristas/pendentes")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Page<ParticipanteResponse>>> listarMotoristasNaoAprovados(
            @PageableDefault(size = 20, sort = "criadoEm") Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok("Motoristas pendentes de aprovação.",
                participanteService.listarMotoristasNaoAprovados(pageable)));
    }

    @PatchMapping("/{id}/aprovar-motorista")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> aprovarMotorista(@PathVariable Long id) {
        participanteService.aprovarMotorista(id);
        return ResponseEntity.ok(ApiResponse.ok("Motorista aprovado."));
    }

    @PatchMapping("/{id}/rejeitar-motorista")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> rejeitarMotorista(
            @PathVariable Long id,
            @RequestParam(required = false) String motivo) {
        participanteService.rejeitarMotorista(id, motivo);
        return ResponseEntity.ok(ApiResponse.ok("Solicitação rejeitada."));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<ParticipanteResponse>> buscarPorId(
            @PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok("Participante encontrado.",
                participanteService.buscarPorId(id)));
    }

    // ── Push notifications ────────────────────────────────────────────────────

    @PutMapping("/me/push-token")
    public ResponseEntity<ApiResponse<Void>> salvarPushToken(
            @RequestHeader("Authorization") String bearer,
            @RequestBody java.util.Map<String, String> body) {
        participanteService.salvarPushToken(extrairId(bearer), body.get("pushToken"));
        return ResponseEntity.ok(ApiResponse.ok("Push token salvo."));
    }

    @GetMapping("/{id}/push-token")
    public ResponseEntity<ApiResponse<java.util.Map<String, String>>> buscarPushToken(
            @PathVariable Long id) {
        String token = participanteService.buscarPushToken(id);
        return ResponseEntity.ok(ApiResponse.ok("Push token encontrado.", java.util.Map.of("pushToken", token != null ? token : "")));
    }

    // ── Helper ────────────────────────────────────────────────────────────────

    private Long extrairId(String bearer) {
        return jwtService.extrairUserId(bearer.substring(7).trim());
    }
}