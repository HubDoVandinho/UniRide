package com.uniride.userservice.repository;

import com.uniride.userservice.entity.RefreshToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {

    Optional<RefreshToken> findByToken(String token);

    @Modifying
    @Query("UPDATE RefreshToken rt SET rt.revogado = true WHERE rt.participante.id = :participanteId")
    void revogarTodosPorParticipante(Long participanteId);

    @Modifying
    @Query("DELETE FROM RefreshToken rt WHERE rt.expiraEm < :agora OR rt.revogado = true")
    void limparExpiradosERevogados(LocalDateTime agora);
}
