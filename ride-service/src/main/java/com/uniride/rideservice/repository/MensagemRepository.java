package com.uniride.rideservice.repository;

import com.uniride.rideservice.entity.Mensagem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MensagemRepository extends JpaRepository<Mensagem, Long> {
    List<Mensagem> findByCaronaIdOrderByCriadoEmAsc(Long caronaId);
}
