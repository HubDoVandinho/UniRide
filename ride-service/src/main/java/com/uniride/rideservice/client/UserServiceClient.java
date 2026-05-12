package com.uniride.rideservice.client;

import com.uniride.rideservice.dto.response.ApiResponse;
import com.uniride.rideservice.dto.response.PerfilPassageiroResponse;
import com.uniride.rideservice.dto.response.SaoAmigosResponse;
import com.uniride.rideservice.dto.response.VeiculoInfoResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.List;
import java.util.Map;

@FeignClient(name = "user-service", url = "${user.service.url}")
public interface UserServiceClient {

    @GetMapping("/api/v1/amizades/sao-amigos")
    SaoAmigosResponse saoAmigos(@RequestParam("idA") Long idA,
                                 @RequestParam("idB") Long idB);

    @GetMapping("/api/v1/participantes/{id}/veiculo-info")
    VeiculoInfoResponse buscarVeiculo(@PathVariable("id") Long motoristaId);

    @PatchMapping("/api/v1/participantes/{id}/media-avaliacoes")
    void atualizarMediaAvaliacoes(@PathVariable("id") Long participanteId,
                                  @RequestParam("media") Double media);

    @GetMapping("/api/v1/participantes/{id}/perfil-info")
    PerfilPassageiroResponse buscarPerfilPassageiro(@PathVariable("id") Long passageiroId);

    @GetMapping("/api/v1/participantes/motoristas/por-preferencias")
    List<Long> motoristasPorPreferencias(@RequestParam("ids") List<Long> ids);

    @GetMapping("/api/v1/participantes/{id}/push-token")
    ApiResponse<Map<String, String>> buscarPushToken(@PathVariable("id") Long participanteId);
}
