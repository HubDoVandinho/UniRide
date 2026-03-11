package com.uniride.userservice.repository;

import com.uniride.userservice.entity.Veiculo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface VeiculoRepository extends JpaRepository<Veiculo, Long> {

    boolean existsByPlaca(String placa);

    Optional<Veiculo> findByMotoristaId(Long motoristaId);
}
