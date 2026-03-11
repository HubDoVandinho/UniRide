package com.uniride.institutionservice.repository;

import com.uniride.institutionservice.entity.Instituicao;
import com.uniride.institutionservice.enums.StatusInstituicao;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface InstituicaoRepository extends JpaRepository<Instituicao, Long> {

    boolean existsByDominioEmail(String dominioEmail);

    boolean existsByNomeIgnoreCase(String nome);

    Optional<Instituicao> findByDominioEmailAndStatus(String dominioEmail, StatusInstituicao status);

    Optional<Instituicao> findByDominioEmail(String dominioEmail);

    Page<Instituicao> findByStatus(StatusInstituicao status, Pageable pageable);

    @Query("SELECT i FROM Instituicao i WHERE i.status = 'ATIVA' AND " +
           "(LOWER(i.nome) LIKE LOWER(CONCAT('%', :termo, '%')) OR " +
           "LOWER(i.sigla) LIKE LOWER(CONCAT('%', :termo, '%')) OR " +
           "LOWER(i.cidade) LIKE LOWER(CONCAT('%', :termo, '%')))")
    Page<Instituicao> buscar(@Param("termo") String termo, Pageable pageable);

    Page<Instituicao> findByCidadeIgnoreCaseAndStatus(String cidade, StatusInstituicao status, Pageable pageable);
}
