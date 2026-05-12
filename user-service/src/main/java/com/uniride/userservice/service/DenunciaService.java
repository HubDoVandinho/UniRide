package com.uniride.userservice.service;

import com.uniride.userservice.dto.request.CriarDenunciaRequest;
import com.uniride.userservice.dto.request.RevisarDenunciaRequest;
import com.uniride.userservice.dto.response.BloqueioResponse;
import com.uniride.userservice.dto.response.DenunciaResponse;
import com.uniride.userservice.enums.StatusDenuncia;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface DenunciaService {
    DenunciaResponse criar(Long denuncianteId, CriarDenunciaRequest request);
    Page<DenunciaResponse> listarPorStatus(StatusDenuncia status, Pageable pageable);
    Page<DenunciaResponse> listarPorDenunciado(Long denunciadoId, Pageable pageable);
    DenunciaResponse revisar(Long denunciaId, RevisarDenunciaRequest request);
    void bloquear(Long bloqueadorId, Long bloqueadoId);
    void desbloquear(Long bloqueadorId, Long bloqueadoId);
    boolean estaBloqueado(Long bloqueadorId, Long bloqueadoId);
    List<BloqueioResponse> listarBloqueios(Long bloqueadorId);
}
