package com.uniride.userservice.service.impl;

import com.uniride.userservice.dto.request.CadastroVeiculoRequest;
import com.uniride.userservice.dto.request.PromoverMotoristaRequest;
import com.uniride.userservice.dto.response.ParticipanteResponse;
import com.uniride.userservice.entity.Motorista;
import com.uniride.userservice.entity.Participante;
import com.uniride.userservice.entity.Veiculo;
import com.uniride.userservice.exception.BusinessException;
import com.uniride.userservice.exception.ConflictException;
import com.uniride.userservice.exception.RecursoNaoEncontradoException;
import com.uniride.userservice.repository.MotoristaRepository;
import com.uniride.userservice.repository.ParticipanteRepository;
import com.uniride.userservice.repository.VeiculoRepository;
import com.uniride.userservice.service.ParticipanteMapper;
import com.uniride.userservice.service.PromoverMotoristaService;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

@Slf4j
@Service
@RequiredArgsConstructor
public class PromoverMotoristaServiceImpl implements PromoverMotoristaService {

    private final ParticipanteRepository participanteRepository;
    private final MotoristaRepository    motoristaRepository;
    private final VeiculoRepository      veiculoRepository;
    private final ParticipanteMapper     participanteMapper;
    private final EntityManager          entityManager;

    @Override
    @Transactional
    public ParticipanteResponse promover(Long participanteId, PromoverMotoristaRequest req) {

        // 1. Verificar que o participante existe
        Participante participante = participanteRepository.findById(participanteId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Participante"));

        // 2. Verificar que ainda não é motorista
        if (participante instanceof Motorista) {
            throw new BusinessException("Você já possui perfil de motorista.");
        }

        // 3. Verificar CNH única
        if (motoristaRepository.existsByCnh(req.getCnh())) {
            throw new ConflictException("CNH já cadastrada no sistema.");
        }

        // 4. Verificar placa única
        CadastroVeiculoRequest veiculoReq = req.getVeiculo();
        if (veiculoReq != null && veiculoRepository.existsByPlaca(veiculoReq.getPlaca())) {
            throw new ConflictException("Placa já cadastrada no sistema.");
        }

        // 5. Alterar dtype via query nativa
        //    JPA SINGLE_TABLE não permite mudar o discriminador via JPQL,
        //    por isso usamos SQL nativo diretamente.
        log.info("Promovendo participante id={} para MOTORISTA", participanteId);

        entityManager.createNativeQuery(
                "UPDATE participantes SET dtype = 'MOTORISTA' WHERE id = :id"
        ).setParameter("id", participanteId).executeUpdate();

        // 6. Limpar cache de 1º nível para forçar releitura com o novo dtype
        entityManager.flush();
        entityManager.clear();

        // 7. Recarregar como Motorista
        Motorista motorista = motoristaRepository.findById(participanteId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Motorista"));

        // 8. Popular campos específicos de Motorista
        motorista.setCnh(req.getCnh().trim());
        motorista.setAprovadoAdmin(false);
        motorista.setTotalCaronasOferecidas(0);

        if (req.getValidadeCnh() != null && !req.getValidadeCnh().isBlank()) {
            try {
                motorista.setValidadeCnh(LocalDate.parse(req.getValidadeCnh()));
            } catch (Exception e) {
                log.warn("Validade de CNH inválida, ignorando: {}", req.getValidadeCnh());
            }
        }

        if (req.getMiniBiografia() != null) {
            motorista.setMiniBiografia(req.getMiniBiografia().trim());
        }

        motoristaRepository.save(motorista);

        // 9. Cadastrar veículo
        if (veiculoReq != null) {
            Veiculo veiculo = new Veiculo();
            veiculo.setPlaca(veiculoReq.getPlaca().toUpperCase().replaceAll("[^A-Z0-9]", ""));
            veiculo.setModelo(veiculoReq.getModelo().trim());
            veiculo.setMarca(veiculoReq.getMarca().trim());
            veiculo.setCor(veiculoReq.getCor() != null ? veiculoReq.getCor().trim() : null);
            veiculo.setAno(veiculoReq.getAno());
            veiculo.setCapacidade(veiculoReq.getCapacidade());
            veiculo.setTipo(veiculoReq.getTipo());
            veiculo.setTemSeguro(veiculoReq.getTemSeguro() != null && veiculoReq.getTemSeguro());
            veiculo.setMotorista(motorista);
            veiculoRepository.save(veiculo);
            log.info("Veículo placa={} cadastrado para motorista id={}", veiculo.getPlaca(), participanteId);
        }

        log.info("Participante id={} promovido a MOTORISTA com sucesso", participanteId);

        // 10. Recarregar e retornar resposta atualizada
        Motorista motoristaAtualizado = motoristaRepository.findById(participanteId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Motorista"));

        return participanteMapper.toResponse(motoristaAtualizado);
    }
}