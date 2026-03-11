package com.uniride.userservice.repository;

import com.uniride.userservice.entity.Participante;
import com.uniride.userservice.enums.StatusParticipante;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ParticipanteRepository extends JpaRepository<Participante, Long> {

    Optional<Participante> findByEmail(String email);

    Optional<Participante> findByCpf(String cpf);

    boolean existsByEmail(String email);

    boolean existsByCpf(String cpf);

    @Query("SELECT p FROM Participante p WHERE p.email = :email AND p.status = 'ATIVO'")
    Optional<Participante> findAtivoByEmail(String email);

    List<Participante> findAllByStatus(StatusParticipante status);
}
