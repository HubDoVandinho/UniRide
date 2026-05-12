package com.uniride.userservice.service;

import com.uniride.userservice.client.InstitutionClient;
import com.uniride.userservice.client.ApiClientResponse;
import com.uniride.userservice.client.dto.InstituicaoClientResponse;
import com.uniride.userservice.dto.response.*;
import com.uniride.userservice.entity.*;
import com.uniride.userservice.repository.ParticipantePreferenciaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class ParticipanteMapper {

    private final InstitutionClient institutionClient;
    private final ParticipantePreferenciaRepository participantePreferenciaRepository;

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
                            .lat(i.getLat()).lng(i.getLng())
                            .build();
                }
            } catch (Exception e) {
                log.warn("Nao foi possivel buscar instituicao id={}: {}", p.getInstituicaoId(), e.getMessage());
            }
        }

        ParticipanteResponse.ParticipanteResponseBuilder builder = ParticipanteResponse.builder()
                .id(p.getId())
                .nome(p.getNome())
                .username(p.getUsername())
                .emailPessoal(p.getEmailPessoal())
                .emailInstitucional(p.getEmailInstitucional())
                .cpf(p.getCpf())
                .miniBiografia(p.getMiniBiografia())
                .fotoPerfilUrl(p.getFotoPerfilUrl())
                .verificado(p.getVerificado())
                .status(p.getStatus())
                .criadoEm(p.getCriadoEm())
                .instituicao(instituicaoResponse)
                .enderecos(p.getEnderecos().stream().map(this::toEnderecoResponse).toList())
                .telefones(p.getTelefones().stream().map(this::toTelefoneResponse).toList())
                .mediaAvaliacoes(p.getMediaAvaliacoes())
                .preferencias(participantePreferenciaRepository.findAllByParticipanteId(p.getId())
                        .stream()
                        .map(pp -> TipoPreferenciaResponse.builder()
                                .id(pp.getTipoPreferencia().getId())
                                .nome(pp.getTipoPreferencia().getNome())
                                .descricao(pp.getTipoPreferencia().getDescricao())
                                .build())
                        .toList());

        if (p instanceof Motorista m) {
            List<VeiculoResponse> veiculosList = m.getVeiculos().stream()
                    .map(this::toVeiculoResponse)
                    .toList();
            builder.tipo("MOTORISTA")
                    .cnh(m.getCnh())
                    .validadeCnh(m.getValidadeCnh())
                    .aprovadoAdmin(m.getAprovadoAdmin())
                    .veiculos(veiculosList)
                    .veiculo(veiculosList.isEmpty() ? null : veiculosList.get(0));
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
                .validadeCnh(v.getMotorista() != null ? v.getMotorista().getValidadeCnh() : null)
                .aprovadoAdmin(v.getMotorista() != null ? v.getMotorista().getAprovadoAdmin() : null)
                .build();
    }

    public EnderecoResponse toEnderecoResponse(Endereco e) {
        return EnderecoResponse.builder()
                .id(e.getId()).nome(e.getNome()).rua(e.getRua()).numero(e.getNumero())
                .bairro(e.getBairro()).cep(e.getCep())
                .cidade(e.getCidade()).estado(e.getEstado())
                .lat(e.getLat()).lng(e.getLng())
                .build();
    }

    public TelefoneResponse toTelefoneResponse(Telefone t) {
        return TelefoneResponse.builder()
                .id(t.getId()).ddd(t.getDdd()).numero(t.getNumero())
                .tipo(t.getTipo()).principal(t.getPrincipal())
                .build();
    }
}