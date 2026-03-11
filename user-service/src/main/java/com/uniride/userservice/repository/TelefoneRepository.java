package com.uniride.userservice.repository;

import com.uniride.userservice.entity.Telefone;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TelefoneRepository extends JpaRepository<Telefone, Long> {
    List<Telefone> findAllByParticipanteId(Long participanteId);
}
