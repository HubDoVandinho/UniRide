package com.uniride.institutionservice.service.impl;

import com.uniride.institutionservice.config.InstituicaoMapper;
import com.uniride.institutionservice.dto.request.AtualizarInstituicaoRequest;
import com.uniride.institutionservice.dto.request.CriarInstituicaoRequest;
import com.uniride.institutionservice.dto.response.InstituicaoResponse;
import com.uniride.institutionservice.dto.response.ValidacaoDominioResponse;
import com.uniride.institutionservice.entity.Instituicao;
import com.uniride.institutionservice.enums.StatusInstituicao;
import com.uniride.institutionservice.exception.ConflictException;
import com.uniride.institutionservice.exception.RecursoNaoEncontradoException;
import com.uniride.institutionservice.repository.InstituicaoRepository;
import com.uniride.institutionservice.service.InstituicaoService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class InstituicaoServiceImpl implements InstituicaoService {

    private final InstituicaoRepository repository;
    private final InstituicaoMapper mapper;

    @Override
    @Transactional
    public InstituicaoResponse criar(CriarInstituicaoRequest request) {
        String dominio = request.getDominioEmail().trim().toLowerCase();

        if (repository.existsByDominioEmail(dominio)) {
            throw new ConflictException("Já existe uma instituição com o domínio: " + dominio);
        }
        if (repository.existsByNomeIgnoreCase(request.getNome().trim())) {
            throw new ConflictException("Já existe uma instituição com o nome: " + request.getNome());
        }

        Instituicao instituicao = mapper.toEntity(request);
        instituicao = repository.save(instituicao);

        log.info("Instituição criada: id={}, nome={}, dominio={}",
                instituicao.getId(), instituicao.getNome(), instituicao.getDominioEmail());

        return mapper.toResponse(instituicao);
    }

    @Override
    @Transactional(readOnly = true)
    public InstituicaoResponse buscarPorId(Long id) {
        return mapper.toResponse(encontrar(id));
    }

    @Override
    @Transactional(readOnly = true)
    public Page<InstituicaoResponse> listarAtivas(Pageable pageable) {
        return repository.findByStatus(StatusInstituicao.ATIVA, pageable)
                .map(mapper::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<InstituicaoResponse> listarTodas(Pageable pageable) {
        return repository.findAll(pageable).map(mapper::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<InstituicaoResponse> buscar(String termo, Pageable pageable) {
        return repository.buscar(termo, pageable).map(mapper::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<InstituicaoResponse> buscarPorCidade(String cidade, Pageable pageable) {
        return repository.findByCidadeIgnoreCaseAndStatus(cidade, StatusInstituicao.ATIVA, pageable)
                .map(mapper::toResponse);
    }

    @Override
    @Transactional
    public InstituicaoResponse atualizar(Long id, AtualizarInstituicaoRequest request) {
        Instituicao instituicao = encontrar(id);
        mapper.atualizar(instituicao, request);
        log.info("Instituição atualizada: id={}", id);
        return mapper.toResponse(repository.save(instituicao));
    }

    @Override
    @Transactional
    public void ativar(Long id) {
        Instituicao instituicao = encontrar(id);
        instituicao.setStatus(StatusInstituicao.ATIVA);
        repository.save(instituicao);
        log.info("Instituição ativada: id={}", id);
    }

    @Override
    @Transactional
    public void desativar(Long id) {
        Instituicao instituicao = encontrar(id);
        instituicao.setStatus(StatusInstituicao.INATIVA);
        repository.save(instituicao);
        log.info("Instituição desativada: id={}", id);
    }

    @Override
    @Transactional(readOnly = true)
    public ValidacaoDominioResponse validarDominio(String dominio) {
        String dominioNormalizado = dominio.trim().toLowerCase();

        return repository.findByDominioEmailAndStatus(dominioNormalizado, StatusInstituicao.ATIVA)
                .map(i -> ValidacaoDominioResponse.builder()
                        .valido(true)
                        .instituicaoId(i.getId())
                        .nome(i.getNome())
                        .cidade(i.getCidade())
                        .estado(i.getEstado())
                        .build())
                .orElse(ValidacaoDominioResponse.builder()
                        .valido(false)
                        .build());
    }

    private Instituicao encontrar(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Instituição"));
    }
}
