package com.uniride.institutionservice.config;

import com.uniride.institutionservice.dto.request.AtualizarInstituicaoRequest;
import com.uniride.institutionservice.dto.request.CriarInstituicaoRequest;
import com.uniride.institutionservice.dto.response.InstituicaoResponse;
import com.uniride.institutionservice.entity.Instituicao;
import org.springframework.stereotype.Component;

@Component
public class InstituicaoMapper {

    public Instituicao toEntity(CriarInstituicaoRequest req) {
        return Instituicao.builder()
                .nome(req.getNome().trim())
                .sigla(req.getSigla() != null ? req.getSigla().trim().toUpperCase() : null)
                .dominioEmail(req.getDominioEmail().trim().toLowerCase())
                .tipo(req.getTipo())
                .rua(req.getRua())
                .numero(req.getNumero())
                .bairro(req.getBairro())
                .cidade(req.getCidade().trim())
                .estado(req.getEstado().trim().toUpperCase())
                .cep(req.getCep())
                .build();
    }

    public InstituicaoResponse toResponse(Instituicao i) {
        return InstituicaoResponse.builder()
                .id(i.getId())
                .nome(i.getNome())
                .sigla(i.getSigla())
                .dominioEmail(i.getDominioEmail())
                .tipo(i.getTipo())
                .rua(i.getRua())
                .numero(i.getNumero())
                .bairro(i.getBairro())
                .cidade(i.getCidade())
                .estado(i.getEstado())
                .cep(i.getCep())
                .status(i.getStatus())
                .criadoEm(i.getCriadoEm())
                .atualizadoEm(i.getAtualizadoEm())
                .build();
    }

    public void atualizar(Instituicao instituicao, AtualizarInstituicaoRequest req) {
        if (req.getNome() != null) instituicao.setNome(req.getNome().trim());
        if (req.getSigla() != null) instituicao.setSigla(req.getSigla().trim().toUpperCase());
        if (req.getTipo() != null) instituicao.setTipo(req.getTipo());
        if (req.getRua() != null) instituicao.setRua(req.getRua());
        if (req.getNumero() != null) instituicao.setNumero(req.getNumero());
        if (req.getBairro() != null) instituicao.setBairro(req.getBairro());
        if (req.getCidade() != null) instituicao.setCidade(req.getCidade().trim());
        if (req.getEstado() != null) instituicao.setEstado(req.getEstado().trim().toUpperCase());
        if (req.getCep() != null) instituicao.setCep(req.getCep());
    }
}
