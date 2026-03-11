package com.uniride.institutionservice.service;

import com.uniride.institutionservice.dto.request.AtualizarInstituicaoRequest;
import com.uniride.institutionservice.dto.request.CriarInstituicaoRequest;
import com.uniride.institutionservice.dto.response.InstituicaoResponse;
import com.uniride.institutionservice.dto.response.ValidacaoDominioResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface InstituicaoService {

    InstituicaoResponse criar(CriarInstituicaoRequest request);

    InstituicaoResponse buscarPorId(Long id);

    Page<InstituicaoResponse> listarAtivas(Pageable pageable);

    Page<InstituicaoResponse> listarTodas(Pageable pageable);

    Page<InstituicaoResponse> buscar(String termo, Pageable pageable);

    Page<InstituicaoResponse> buscarPorCidade(String cidade, Pageable pageable);

    InstituicaoResponse atualizar(Long id, AtualizarInstituicaoRequest request);

    void ativar(Long id);

    void desativar(Long id);

    ValidacaoDominioResponse validarDominio(String dominio);
}
