package com.uniride.userservice.repository;

import com.uniride.userservice.entity.Amizade;
import com.uniride.userservice.enums.StatusAmizade;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AmizadeRepository extends JpaRepository<Amizade, Long> {

    // Busca amizade entre dois participantes em qualquer direção
    @Query("""
        SELECT a FROM Amizade a
        WHERE (a.solicitante.id = :idA AND a.destinatario.id = :idB)
           OR (a.solicitante.id = :idB AND a.destinatario.id = :idA)
    """)
    Optional<Amizade> findEntre(@Param("idA") Long idA, @Param("idB") Long idB);

    // Verifica se dois participantes são amigos (status = ACEITA)
    @Query("""
        SELECT COUNT(a) > 0 FROM Amizade a
        WHERE a.status = 'ACEITA'
          AND ((a.solicitante.id = :idA AND a.destinatario.id = :idB)
            OR (a.solicitante.id = :idB AND a.destinatario.id = :idA))
    """)
    boolean saoAmigos(@Param("idA") Long idA, @Param("idB") Long idB);

    // Lista amigos aceitos de um participante
    @Query("""
        SELECT a FROM Amizade a
        WHERE a.status = 'ACEITA'
          AND (a.solicitante.id = :id OR a.destinatario.id = :id)
    """)
    List<Amizade> findAmigosAceitos(@Param("id") Long id);

    // Solicitações recebidas pendentes
    List<Amizade> findByDestinatarioIdAndStatus(Long destinatarioId, StatusAmizade status);

    // Solicitações enviadas pendentes
    List<Amizade> findBySolicitanteIdAndStatus(Long solicitanteId, StatusAmizade status);

    // Verifica se já existe algum vínculo entre os dois (qualquer status)
    @Query("""
        SELECT COUNT(a) > 0 FROM Amizade a
        WHERE (a.solicitante.id = :idA AND a.destinatario.id = :idB)
           OR (a.solicitante.id = :idB AND a.destinatario.id = :idA)
    """)
    boolean existeVinculo(@Param("idA") Long idA, @Param("idB") Long idB);

    // Lista todos os participantes da mesma instituição (para sugestão de amigos)
    @Query("""
        SELECT p.id FROM Participante p
        WHERE p.instituicaoId = :instituicaoId
          AND p.id != :meuId
          AND p.id NOT IN (
              SELECT a.destinatario.id FROM Amizade a WHERE a.solicitante.id = :meuId
              UNION
              SELECT a.solicitante.id FROM Amizade a WHERE a.destinatario.id = :meuId
          )
    """)
    List<Long> findSugestoesDaInstituicao(@Param("meuId") Long meuId,
                                           @Param("instituicaoId") Long instituicaoId);
}
