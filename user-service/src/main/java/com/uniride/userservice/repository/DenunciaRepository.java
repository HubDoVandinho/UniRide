package com.uniride.userservice.repository;

import com.uniride.userservice.entity.Denuncia;
import com.uniride.userservice.enums.StatusDenuncia;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DenunciaRepository extends JpaRepository<Denuncia, Long> {

    boolean existsByDenuncianteIdAndDenunciadoIdAndCaronaId(Long denuncianteId, Long denunciadoId, Long caronaId);

    boolean existsByDenuncianteIdAndDenunciadoIdAndCaronaIdIsNull(Long denuncianteId, Long denunciadoId);

    long countByDenunciadoId(Long denunciadoId);

    long countByDenunciadoIdAndStatus(Long denunciadoId, StatusDenuncia status);

    Page<Denuncia> findAllByStatus(StatusDenuncia status, Pageable pageable);

    Page<Denuncia> findAllByDenunciadoId(Long denunciadoId, Pageable pageable);
}
