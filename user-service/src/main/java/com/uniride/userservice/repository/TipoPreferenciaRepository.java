package com.uniride.userservice.repository;

import com.uniride.userservice.entity.TipoPreferencia;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TipoPreferenciaRepository extends JpaRepository<TipoPreferencia, Long> {
    List<TipoPreferencia> findAllByAtivoTrue();
    List<TipoPreferencia> findAllByAtivoTrueAndDestinatarioIn(List<String> destinatarios);
    List<TipoPreferencia> findAllByCriadoPorParticipanteId(Long participanteId);
    boolean existsByNomeIgnoreCaseAndCriadoPorParticipanteId(String nome, Long participanteId);
    long countByCriadoPorParticipanteId(Long participanteId);
}
