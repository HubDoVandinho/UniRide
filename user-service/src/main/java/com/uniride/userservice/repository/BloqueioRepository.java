package com.uniride.userservice.repository;

import com.uniride.userservice.entity.Bloqueio;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BloqueioRepository extends JpaRepository<Bloqueio, Long> {

    boolean existsByBloqueadorIdAndBloqueadoId(Long bloqueadorId, Long bloqueadoId);

    Optional<Bloqueio> findByBloqueadorIdAndBloqueadoId(Long bloqueadorId, Long bloqueadoId);

    List<Bloqueio> findAllByBloqueadorId(Long bloqueadorId);
}
