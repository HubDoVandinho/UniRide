package com.uniride.userservice.service;

import com.uniride.userservice.client.InstitutionClient;
import com.uniride.userservice.client.ApiClientResponse;
import com.uniride.userservice.client.dto.InstituicaoClientResponse;
import com.uniride.userservice.dto.response.*;
import com.uniride.userservice.entity.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class ParticipanteMapper {

    private final InstitutionClient institutionClient;

    public ParticipanteResponse toResponse(Participante p) {
        InstituicaoResponse instituicaoResponse = null;
        if (p.getInstituicaoId() != null) {
            try {
                ApiClientResponse<InstituicaoClientResponse> resp =
                        institutionClient.buscarPorId(p.getInstituicaoId());
                if (resp != null && resp.getDados() != null) {
                    InstituicaoClientResponse i = resp.getDados();
                    instituicaoResponse = InstituicaoResponse.builder()
                            .id(i.getId()).nome(i.getNome())
                            .sigla(i.getSigla()).cidade(i.getCidade())
                            .rua(i.getRua()).numero(i.getNumero())
                            .bairro(i.getBairro()).cep(i.getCep())
                            .estado(i.getEstado())
                            .build();
                }
            } catch (Exception e) {
                log.warn("Nao foi possivel buscar instituicao id={}: {}", p.getInstituicaoId(), e.getMessage());
            }
        }

        ParticipanteResponse.ParticipanteResponseBuilder builder = ParticipanteResponse.builder()
                .id(p.getId())
                .nome(p.getNome())
                .email(p.getEmail())
                .cpf(p.getCpf())
                .miniBiografia(p.getMiniBiografia())
                .verificado(p.getVerificado())
                .status(p.getStatus())
                .criadoEm(p.getCriadoEm())
                .instituicao(instituicaoResponse)
                .enderecos(p.getEnderecos().stream().map(this::toEnderecoResponse).toList())
                .telefones(p.getTelefones().stream().map(this::toTelefoneResponse).toList());

        if (p instanceof Motorista m) {
            builder.tipo("MOTORISTA")
                    .cnh(m.getCnh())
                    .validadeCnh(m.getValidadeCnh())
                    .aprovadoAdmin(m.getAprovadoAdmin())
                    .veiculo(m.getVeiculo() != null ? toVeiculoResponse(m.getVeiculo()) : null);
        } else if (p instanceof Passageiro pa) {
            builder.tipo("PASSAGEIRO")
                    .necessidadesEspeciais(pa.getNecessidadesEspeciais());
        } else if (p instanceof Admin) {
            builder.tipo("ADMIN");
        }

        return builder.build();
    }

    public VeiculoResponse toVeiculoResponse(Veiculo v) {
        return VeiculoResponse.builder()
                .id(v.getId()).placa(v.getPlaca()).tipo(v.getTipo())
                .modelo(v.getModelo()).marca(v.getMarca()).ano(v.getAno())
                .cor(v.getCor()).capacidade(v.getCapacidade())
                .temSeguro(v.getTemSeguro()).acessivel(v.getAcessivel())
                .tipoCombustivel(v.getTipoCombustivel())
                .qtdPortas(v.getQtdPortas()).cilindrada(v.getCilindrada())
                .temBauleto(v.getTemBauleto())
                .build();
    }

    public EnderecoResponse toEnderecoResponse(Endereco e) {
        return EnderecoResponse.builder()
                .id(e.getId()).rua(e.getRua()).numero(e.getNumero())
                .bairro(e.getBairro()).cep(e.getCep())
                .cidade(e.getCidade()).estado(e.getEstado())
                .build();
    }

    public TelefoneResponse toTelefoneResponse(Telefone t) {
        return TelefoneResponse.builder()
                .id(t.getId()).ddd(t.getDdd()).numero(t.getNumero())
                .tipo(t.getTipo()).principal(t.getPrincipal())
                .build();
    }
}