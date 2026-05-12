package com.uniride.userservice.repository;

import com.uniride.userservice.entity.Participante;
import com.uniride.userservice.enums.StatusParticipante;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ParticipanteRepository extends JpaRepository<Participante, Long> {

    Optional<Participante> findByEmailPessoal(String emailPessoal);

    Optional<Participante> findByUsername(String username);

    boolean existsByUsername(String username);

    Optional<Participante> findByCpf(String cpf);

    boolean existsByEmailPessoal(String emailPessoal);

    boolean existsByEmailInstitucional(String emailInstitucional);

    boolean existsByCpf(String cpf);

    @Query("SELECT p FROM Participante p WHERE p.emailPessoal = :emailPessoal AND p.status = 'ATIVO'")
    Optional<Participante> findAtivoByEmailPessoal(String emailPessoal);

    @Query("""
        SELECT p FROM Participante p
        WHERE p.instituicaoId = :instituicaoId
          AND p.id != :meuId
          AND p.status = 'ATIVO'
          AND (
            LOWER(p.nome) LIKE LOWER(CONCAT('%', :termo, '%'))
            OR LOWER(p.username) LIKE LOWER(CONCAT('%', :termo, '%'))
          )
        ORDER BY p.nome ASC
    """)
    List<Participante> buscarPorNomeNaInstituicao(@Param("meuId") Long meuId,
                                                  @Param("instituicaoId") Long instituicaoId,
                                                  @Param("termo") String termo);

    Optional<Participante> findByTokenConfirmacao(String tokenConfirmacao);

    Optional<Participante> findByEmailPessoalOrEmailInstitucional(String emailPessoal, String emailInstitucional);

    Optional<Participante> findByTokenResetSenha(String tokenResetSenha);

    List<Participante> findAllByStatus(StatusParticipante status);
}
