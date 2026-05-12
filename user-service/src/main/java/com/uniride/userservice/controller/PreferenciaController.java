package com.uniride.userservice.controller;

import com.uniride.userservice.dto.response.ApiResponse;
import com.uniride.userservice.dto.response.TipoPreferenciaResponse;
import com.uniride.userservice.repository.ParticipantePreferenciaRepository;
import com.uniride.userservice.repository.TipoPreferenciaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class PreferenciaController {

    private final TipoPreferenciaRepository tipoPreferenciaRepository;
    private final ParticipantePreferenciaRepository participantePreferenciaRepository;

    /**
     * Público — lista tipos de preferência ativos.
     * @param destinatario "MOTORISTA" | "PASSAGEIRO" | null (todos)
     */
    @GetMapping("/api/v1/preferencias")
    public ResponseEntity<ApiResponse<List<TipoPreferenciaResponse>>> listarTipos(
            @RequestParam(required = false) String destinatario) {
        List<com.uniride.userservice.entity.TipoPreferencia> entidades;
        if (destinatario != null && !destinatario.isBlank()) {
            entidades = tipoPreferenciaRepository
                    .findAllByAtivoTrueAndDestinatarioIn(java.util.List.of(destinatario, "AMBOS"));
        } else {
            entidades = tipoPreferenciaRepository.findAllByAtivoTrue();
        }
        List<TipoPreferenciaResponse> tipos = entidades.stream()
                .filter(t -> t.getCriadoPorParticipanteId() == null) // exclui preferências pessoais
                .map(t -> TipoPreferenciaResponse.builder()
                        .id(t.getId()).nome(t.getNome()).descricao(t.getDescricao())
                        .build())
                .toList();
        return ResponseEntity.ok(ApiResponse.ok("Tipos de preferência listados.", tipos));
    }

    /**
     * Interno (Feign do ride-service) — retorna IDs de participantes que possuem
     * TODAS as preferências informadas.
     */
    @GetMapping("/api/v1/participantes/motoristas/por-preferencias")
    public List<Long> motoristasPorPreferencias(@RequestParam List<Long> ids) {
        if (ids == null || ids.isEmpty()) return List.of();
        return participantePreferenciaRepository
                .findParticipanteIdsComTodasPreferencias(ids, ids.size());
    }
}
