package com.uniride.rideservice.repository;

import com.uniride.rideservice.entity.Avaliacao;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface AvaliacaoRepository extends JpaRepository<Avaliacao, Long> {

    List<Avaliacao> findByAvaliadoId(Long avaliadoId);

    boolean existsByAvaliadorIdAndAvaliadoIdAndCaronaId(
            Long avaliadorId, Long avaliadoId, Long caronaId);

    boolean existsByAvaliadorIdAndCaronaId(Long avaliadorId, Long caronaId);

    @Query("SELECT AVG(a.nota) FROM Avaliacao a WHERE a.avaliadoId = :id")
    Optional<Double> mediaByAvaliadoId(@Param("id") Long avaliadoId);
}
