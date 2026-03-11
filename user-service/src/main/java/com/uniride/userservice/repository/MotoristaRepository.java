package com.uniride.userservice.repository;

import com.uniride.userservice.entity.Motorista;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface MotoristaRepository extends JpaRepository<Motorista, Long> {

    boolean existsByCnh(String cnh);

    Optional<Motorista> findByCnh(String cnh);
}
