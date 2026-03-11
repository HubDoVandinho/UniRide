package com.uniride.userservice.repository;

import com.uniride.userservice.entity.Endereco;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EnderecoRepository extends JpaRepository<Endereco, Long> {
    List<Endereco> findAllByParticipanteId(Long participanteId);
}
