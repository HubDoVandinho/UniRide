package com.uniride.rideservice.repository;

import com.uniride.rideservice.entity.Rotina;
import com.uniride.rideservice.enums.StatusRotina;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface RotinaRepository extends JpaRepository<Rotina, Long> {

    List<Rotina> findByMotoristaId(Long motoristaId);

    boolean existsByMotoristaIdAndNomeIgnoreCase(Long motoristaId, String nome);

    @Query("""
        SELECT r FROM Rotina r
        WHERE r.status = 'ATIVA'
          AND r.latOrigem IS NOT NULL
          AND r.lngOrigem IS NOT NULL
          AND (r.dataFim IS NULL OR r.dataFim >= :hoje)
    """)
    List<Rotina> findAtivasComCoordenadas(@Param("hoje") LocalDate hoje);

    @Query("""
        SELECT r FROM Rotina r
        WHERE r.instituicaoId = :instId
          AND r.status = 'ATIVA'
          AND (r.dataFim IS NULL OR r.dataFim >= :hoje)
    """)
    List<Rotina> findMural(@Param("instId") Long instituicaoId,
                            @Param("hoje") LocalDate hoje);

    List<Rotina> findByStatusAndDataFimIsNullOrStatusAndDataFimGreaterThanEqual(
            StatusRotina s1, StatusRotina s2, LocalDate data);
}
