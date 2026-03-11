package com.uniride.userservice.repository;

import com.uniride.userservice.entity.TentativaLogin;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;

@Repository
public interface TentativaLoginRepository extends JpaRepository<TentativaLogin, Long> {

    @Query("SELECT COUNT(t) FROM TentativaLogin t " +
           "WHERE t.email = :email AND t.sucesso = false AND t.dataHora >= :desde")
    long contarFalhasPorEmail(String email, LocalDateTime desde);

    @Query("SELECT COUNT(t) FROM TentativaLogin t " +
           "WHERE t.ipOrigem = :ip AND t.sucesso = false AND t.dataHora >= :desde")
    long contarFalhasPorIp(String ip, LocalDateTime desde);
}
