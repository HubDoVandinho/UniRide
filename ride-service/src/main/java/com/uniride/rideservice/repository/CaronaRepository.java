package com.uniride.rideservice.repository;

import com.uniride.rideservice.entity.Carona;
import com.uniride.rideservice.enums.Direcao;
import com.uniride.rideservice.enums.StatusCarona;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface CaronaRepository extends JpaRepository<Carona, Long> {

    List<Carona> findByMotoristaId(Long motoristaId);

    List<Carona> findByRotinaId(Long rotinaId);

    @Modifying
    @Query("UPDATE Carona c SET c.rotinaId = null WHERE c.rotinaId = :rotinaId")
    void desvincularRotina(@Param("rotinaId") Long rotinaId);

    long countByRotinaId(Long rotinaId);

    // Paginado — usado no controller do mural
    @Query("""
        SELECT c FROM Carona c
        WHERE c.instituicaoId = :instId
          AND c.status = 'AGENDADA'
          AND c.data >= :hoje
        ORDER BY c.data, c.horarioSaida
    """)
    Page<Carona> findMural(@Param("instId") Long instituicaoId,
                           @Param("hoje") LocalDate hoje,
                           Pageable pageable);

    // Não-paginado — usado pelo CaronaScheduler interno
    @Query("""
        SELECT c FROM Carona c
        WHERE c.instituicaoId = :instId
          AND c.status = 'AGENDADA'
          AND c.data >= :hoje
        ORDER BY c.data, c.horarioSaida
    """)
    List<Carona> findMural(@Param("instId") Long instituicaoId,
                           @Param("hoje") LocalDate hoje);

    // Histórico do motorista
    Page<Carona> findByMotoristaIdOrderByDataDescHorarioSaidaDesc(Long motoristaId, Pageable pageable);

    Page<Carona> findByMotoristaIdAndStatusOrderByDataDescHorarioSaidaDesc(
            Long motoristaId, StatusCarona status, Pageable pageable);

    /**
     * Retorna caronas dentro de um bounding box geográfico.
     * Filtra por (latOrigem, lngOrigem) OU (latDestino, lngDestino) dentro dos limites —
     * assim cobre tanto IDA quanto VOLTA numa única query.
     * O Haversine exato é aplicado depois em Java.
     */
    @Query("""
        SELECT c FROM Carona c
        WHERE c.status = 'AGENDADA'
          AND c.data >= :hoje
          AND (:instId IS NULL OR c.instituicaoId = :instId)
          AND (
            (c.latOrigem  BETWEEN :latMin AND :latMax AND c.lngOrigem  BETWEEN :lngMin AND :lngMax)
            OR
            (c.latDestino BETWEEN :latMin AND :latMax AND c.lngDestino BETWEEN :lngMin AND :lngMax)
          )
        ORDER BY c.data, c.horarioSaida
    """)
    List<Carona> findAgendadasNaBoundingBox(@Param("hoje") LocalDate hoje,
                                            @Param("instId") Long instId,
                                            @Param("latMin") double latMin,
                                            @Param("latMax") double latMax,
                                            @Param("lngMin") double lngMin,
                                            @Param("lngMax") double lngMax);

    @Query("""
        SELECT COUNT(c) > 0 FROM Carona c
        WHERE c.rotinaId = :rotinaId
          AND c.data = :data
          AND c.status IN ('AGENDADA', 'EM_ANDAMENTO')
    """)
    boolean existsAtivaPorRotinaEData(@Param("rotinaId") Long rotinaId,
                                      @Param("data") LocalDate data);

    boolean existsByMotoristaIdAndStatus(Long motoristaId, StatusCarona status);

    /** RN4 — impede dois caronas (mesma direção) no mesmo dia para o mesmo motorista */
    @Query("""
        SELECT COUNT(c) > 0 FROM Carona c
        WHERE c.motoristaId = :motoristaId
          AND c.data = :data
          AND c.direcao = :direcao
          AND c.status IN ('AGENDADA', 'EM_ANDAMENTO')
    """)
    boolean existsAtivaPorMotoristaDataEDirecao(@Param("motoristaId") Long motoristaId,
                                                @Param("data") LocalDate data,
                                                @Param("direcao") Direcao direcao);

    @Query("""
        SELECT c FROM Carona c
        WHERE c.motoristaId = :motoristaId
          AND c.status = 'AGENDADA'
          AND c.data >= :hoje
        ORDER BY c.data, c.horarioSaida
    """)
    List<Carona> findUpcomingByMotoristaId(@Param("motoristaId") Long motoristaId,
                                           @Param("hoje") LocalDate hoje);

    @Query("""
        SELECT c FROM Carona c
        WHERE c.motoristaId = :motoristaId
          AND (
            c.status <> 'AGENDADA'
            OR c.id IN (
              SELECT s.carona.id FROM Solicitacao s
              WHERE s.status IN ('PENDENTE', 'APROVADA', 'EMBARCADO')
            )
          )
        ORDER BY c.data DESC, c.horarioSaida DESC
    """)
    List<Carona> findHistoricoByMotoristaId(@Param("motoristaId") Long motoristaId);
}
