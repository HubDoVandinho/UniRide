package com.uniride.rideservice.repository;

import com.uniride.rideservice.entity.Solicitacao;
import com.uniride.rideservice.enums.StatusSolicitacao;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface SolicitacaoRepository extends JpaRepository<Solicitacao, Long> {

    @Query("""
        SELECT s FROM Solicitacao s
        WHERE s.passageiroId = :passageiroId
        ORDER BY s.criadoEm DESC
    """)
    List<Solicitacao> findByPassageiroId(@Param("passageiroId") Long passageiroId);

    List<Solicitacao> findByCaronaId(Long caronaId);

    /** Visão do motorista: apenas solicitações ativas (exclui RECUSADA e CANCELADA) */
    @Query("""
        SELECT s FROM Solicitacao s
        WHERE s.carona.id = :caronaId
          AND s.status NOT IN ('RECUSADA', 'CANCELADA')
        ORDER BY s.criadoEm DESC
    """)
    List<Solicitacao> findAtivasByCaronaId(@Param("caronaId") Long caronaId);

    Optional<Solicitacao> findByCaronaIdAndPassageiroId(Long caronaId, Long passageiroId);

    /** Retorna a solicitação mais recente (qualquer status) — usado para reaproveitar linha RECUSADA/CANCELADA */
    @Query("""
        SELECT s FROM Solicitacao s
        WHERE s.carona.id = :caronaId
          AND s.passageiroId = :passageiroId
        ORDER BY s.criadoEm DESC
        LIMIT 1
    """)
    Optional<Solicitacao> findMaisRecenteByCaronaIdAndPassageiroId(
            @Param("caronaId") Long caronaId,
            @Param("passageiroId") Long passageiroId);

    boolean existsByCaronaIdAndPassageiroIdAndStatusNotIn(
            Long caronaId, Long passageiroId, List<StatusSolicitacao> statusExcluidos);

    boolean existsByCaronaIdAndPassageiroIdAndStatusIn(
            Long caronaId, Long passageiroId, List<StatusSolicitacao> statusIncluidos);

    @Query("""
        SELECT s FROM Solicitacao s
        WHERE s.carona.id = :caronaId
          AND s.status = 'APROVADA'
    """)
    List<Solicitacao> findAprovadosByCaronaId(@Param("caronaId") Long caronaId);

    @Query("""
        SELECT s FROM Solicitacao s
        WHERE s.carona.id = :caronaId
          AND s.status IN ('APROVADA', 'EMBARCADO')
    """)
    List<Solicitacao> findAprovadosEEmbarcadosByCaronaId(@Param("caronaId") Long caronaId);

    @Query("""
        SELECT s FROM Solicitacao s
        WHERE s.carona.id IN :caronaIds
          AND s.status IN ('APROVADA', 'EMBARCADO')
    """)
    List<Solicitacao> findAprovadosEEmbarcadosByCaronaIds(@Param("caronaIds") List<Long> caronaIds);

    @Query("""
        SELECT s FROM Solicitacao s
        WHERE s.carona.id = :caronaId
          AND s.status IN ('PENDENTE', 'APROVADA')
    """)
    List<Solicitacao> findPendentesEAprovadasByCaronaId(@Param("caronaId") Long caronaId);

    @Query("""
        SELECT s FROM Solicitacao s
        WHERE s.passageiroId = :passageiroId
          AND s.status IN ('CONCLUIDA', 'CANCELADA')
        ORDER BY s.criadoEm DESC
    """)
    org.springframework.data.domain.Page<Solicitacao> findHistoricoByPassageiroId(
            @Param("passageiroId") Long passageiroId,
            org.springframework.data.domain.Pageable pageable);

    @Query("""
        SELECT s FROM Solicitacao s
        WHERE s.carona.id = :caronaId
          AND s.status = 'EMBARCADO'
    """)
    List<Solicitacao> findEmbarcadosByCaronaId(@Param("caronaId") Long caronaId);

    @Query("""
        SELECT s FROM Solicitacao s
        WHERE s.carona.id = :caronaId
          AND s.status = 'PENDENTE'
    """)
    List<Solicitacao> findPendentesByCaronaId(@Param("caronaId") Long caronaId);

    @Query("""
        SELECT s FROM Solicitacao s
        WHERE s.carona.motoristaId = :motoristaId
          AND s.status IN ('PENDENTE', 'APROVADA')
        ORDER BY s.criadoEm DESC
    """)
    List<Solicitacao> findRecebidasAtivasByMotoristaId(@Param("motoristaId") Long motoristaId);
}
