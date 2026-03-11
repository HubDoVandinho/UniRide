package com.uniride.userservice.service;

import com.uniride.userservice.dto.request.PromoverMotoristaRequest;
import com.uniride.userservice.dto.response.ParticipanteResponse;

public interface PromoverMotoristaService {

    /**
     * Promove um Passageiro existente para Motorista.
     * Atualiza o dtype na tabela via query nativa e persiste os dados
     * de CNH e veículo.
     *
     * @param participanteId  ID do Passageiro autenticado (extraído do JWT)
     * @param request         Dados de CNH e veículo
     * @return ParticipanteResponse com os dados atualizados do Motorista
     */
    ParticipanteResponse promover(Long participanteId, PromoverMotoristaRequest request);
}
