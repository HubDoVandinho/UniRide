package com.uniride.userservice.repository;

import com.uniride.userservice.entity.ParticipantePreferencia;
import com.uniride.userservice.entity.ParticipantePreferenciaId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ParticipantePreferenciaRepository extends JpaRepository<ParticipantePreferencia, ParticipantePreferenciaId> {

    @Query("SELECT pp FROM ParticipantePreferencia pp JOIN FETCH pp.tipoPreferencia WHERE pp.participanteId = :participanteId")
    List<ParticipantePreferencia> findAllByParticipanteId(@Param("participanteId") Long participanteId);

    @Modifying(clearAutomatically = true)
    @Query("DELETE FROM ParticipantePreferencia pp WHERE pp.participanteId = :participanteId")
    void deleteAllByParticipanteId(@Param("participanteId") Long participanteId);

    /** Remove apenas as preferências globais (não custom) do participante. */
    @Modifying(clearAutomatically = true)
    @Query("""
        DELETE FROM ParticipantePreferencia pp
        WHERE pp.participanteId = :participanteId
          AND pp.tipoPreferenciaId IN (
            SELECT t.id FROM TipoPreferencia t WHERE t.criadoPorParticipanteId IS NULL
          )
    """)
    void deleteGlobaisByParticipanteId(@Param("participanteId") Long participanteId);

    boolean existsByParticipanteIdAndTipoPreferenciaId(Long participanteId, Long tipoPreferenciaId);

    @Query("""
        SELECT pp.participanteId FROM ParticipantePreferencia pp
        WHERE pp.tipoPreferenciaId IN :tiposIds
        GROUP BY pp.participanteId
        HAVING COUNT(DISTINCT pp.tipoPreferenciaId) = :total
    """)
    List<Long> findParticipanteIdsComTodasPreferencias(
            @Param("tiposIds") List<Long> tiposIds,
            @Param("total") long total);
}
