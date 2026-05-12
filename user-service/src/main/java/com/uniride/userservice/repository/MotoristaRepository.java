package com.uniride.userservice.repository;

import com.uniride.userservice.entity.Motorista;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface MotoristaRepository extends JpaRepository<Motorista, Long> {

    boolean existsByCnh(String cnh);

    Optional<Motorista> findByCnh(String cnh);

    @Query("SELECT m FROM Motorista m WHERE m.aprovadoAdmin IS NULL OR m.aprovadoAdmin = false")
    Page<Motorista> findMotoristasNaoAprovados(Pageable pageable);
}
