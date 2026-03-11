package com.uniride.userservice.service.impl;

import com.uniride.userservice.dto.request.*;
import com.uniride.userservice.dto.response.*;
import com.uniride.userservice.entity.*;
import com.uniride.userservice.enums.StatusParticipante;
import com.uniride.userservice.exception.*;
import com.uniride.userservice.repository.*;
import com.uniride.userservice.client.InstitutionClient;
import com.uniride.userservice.service.ParticipanteMapper;
import com.uniride.userservice.service.ParticipanteService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ParticipanteServiceImpl implements ParticipanteService {

    private final ParticipanteRepository participanteRepository;
    private final MotoristaRepository motoristaRepository;
    private final PassageiroRepository passageiroRepository;
    private final VeiculoRepository veiculoRepository;
    private final EnderecoRepository enderecoRepository;
    private final TelefoneRepository telefoneRepository;
    private final InstitutionClient institutionClient;
    private final PasswordEncoder passwordEncoder;
    private final ParticipanteMapper mapper;

    // ── Cadastro ─────────────────────────────────────────

    @Override
    @Transactional
    public ParticipanteResponse cadastrarMotorista(CadastroMotoristaRequest req) {
        validarEmailECpfUnicos(req.getEmail(), req.getCpf());

        if (motoristaRepository.existsByCnh(req.getCnh())) {
            throw new ConflictException("CNH já cadastrada.");
        }

        Motorista motorista = new Motorista();
        motorista.setNome(req.getNome().trim());
        motorista.setEmail(req.getEmail().toLowerCase().trim());
        motorista.setSenhaHash(passwordEncoder.encode(req.getSenha()));
        motorista.setCpf(req.getCpf().replaceAll("[^0-9]", ""));
        motorista.setCnh(req.getCnh());
        motorista.setMiniBiografia(req.getMiniBiografia());
        motorista.setAprovadoAdmin(false);
        motorista.setTotalCaronasOferecidas(0);
        motorista.setStatus(StatusParticipante.ATIVO);

        if (req.getInstituicaoId() != null) {
            validarInstituicao(req.getInstituicaoId());
            motorista.setInstituicaoId(req.getInstituicaoId());
        }

        Motorista salvo = motoristaRepository.save(motorista);
        log.info("Motorista cadastrado: id={}, email={}", salvo.getId(), salvo.getEmail());
        return mapper.toResponse(salvo);
    }

    @Override
    @Transactional
    public ParticipanteResponse cadastrarPassageiro(CadastroPassageiroRequest req) {
        validarEmailECpfUnicos(req.getEmail(), req.getCpf());

        Passageiro passageiro = new Passageiro();
        passageiro.setNome(req.getNome().trim());
        passageiro.setEmail(req.getEmail().toLowerCase().trim());
        passageiro.setSenhaHash(passwordEncoder.encode(req.getSenha()));
        passageiro.setCpf(req.getCpf().replaceAll("[^0-9]", ""));
        passageiro.setNecessidadesEspeciais(req.getNecessidadesEspeciais());
        passageiro.setMiniBiografia(req.getMiniBiografia());
        passageiro.setTotalCaronasSolicitadas(0);
        passageiro.setStatus(StatusParticipante.ATIVO);

        if (req.getInstituicaoId() != null) {
            validarInstituicao(req.getInstituicaoId());
            passageiro.setInstituicaoId(req.getInstituicaoId());
        }

        Passageiro salvo = passageiroRepository.save(passageiro);
        log.info("Passageiro cadastrado: id={}, email={}", salvo.getId(), salvo.getEmail());
        return mapper.toResponse(salvo);
    }

    // ── Perfil ───────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public ParticipanteResponse buscarPorId(Long id) {
        return mapper.toResponse(buscarEntidade(id));
    }

    @Override
    @Transactional
    public ParticipanteResponse atualizarPerfil(Long id, AtualizarPerfilRequest req) {
        Participante p = buscarEntidade(id);

        if (req.getNome() != null) p.setNome(req.getNome().trim());
        if (req.getMiniBiografia() != null) p.setMiniBiografia(req.getMiniBiografia());

        if (req.getInstituicaoId() != null) {
            validarInstituicao(req.getInstituicaoId());
            p.setInstituicaoId(req.getInstituicaoId());
        }

        return mapper.toResponse(participanteRepository.save(p));
    }

    @Override
    @Transactional
    public void desativarConta(Long id) {
        Participante p = buscarEntidade(id);
        p.setStatus(StatusParticipante.INATIVO);
        participanteRepository.save(p);
        log.info("Conta desativada: participanteId={}", id);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ParticipanteResponse> listarTodos(Pageable pageable) {
        return participanteRepository.findAll(pageable).map(mapper::toResponse);
    }

    // ── Veículo ──────────────────────────────────────────

    @Override
    @Transactional
    public ParticipanteResponse cadastrarVeiculo(Long motoristaId, CadastroVeiculoRequest req) {
        Motorista motorista = motoristaRepository.findById(motoristaId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Motorista"));

        if (veiculoRepository.existsByPlaca(req.getPlaca().toUpperCase())) {
            throw new ConflictException("Placa já cadastrada.");
        }

        Veiculo veiculo = Veiculo.builder()
                .placa(req.getPlaca().toUpperCase())
                .tipo(req.getTipo())
                .modelo(req.getModelo())
                .marca(req.getMarca())
                .ano(req.getAno())
                .cor(req.getCor())
                .capacidade(req.getCapacidade())
                .temSeguro(req.getTemSeguro() != null ? req.getTemSeguro() : false)
                .acessivel(req.getAcessivel() != null ? req.getAcessivel() : false)
                .tipoCombustivel(req.getTipoCombustivel())
                .qtdPortas(req.getQtdPortas())
                .cilindrada(req.getCilindrada())
                .temBauleto(req.getTemBauleto())
                .motorista(motorista)
                .build();

        veiculoRepository.save(veiculo);
        motorista.setVeiculo(veiculo);
        return mapper.toResponse(motoristaRepository.save(motorista));
    }

    @Override
    @Transactional(readOnly = true)
    public VeiculoResponse buscarVeiculo(Long motoristaId) {
        Veiculo v = veiculoRepository.findByMotoristaId(motoristaId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Veículo"));
        return mapper.toVeiculoResponse(v);
    }

    // ── Endereço ─────────────────────────────────────────

    @Override
    @Transactional
    public EnderecoResponse adicionarEndereco(Long participanteId, EnderecoRequest req) {
        Participante p = buscarEntidade(participanteId);
        Endereco endereco = Endereco.builder()
                .rua(req.getRua()).numero(req.getNumero()).bairro(req.getBairro())
                .cep(req.getCep().replaceAll("[^0-9]", ""))
                .cidade(req.getCidade()).estado(req.getEstado().toUpperCase())
                .participante(p)
                .build();
        return mapper.toEnderecoResponse(enderecoRepository.save(endereco));
    }

    @Override
    @Transactional(readOnly = true)
    public List<EnderecoResponse> listarEnderecos(Long participanteId) {
        return enderecoRepository.findAllByParticipanteId(participanteId)
                .stream().map(mapper::toEnderecoResponse).toList();
    }

    @Override
    @Transactional
    public void removerEndereco(Long participanteId, Long enderecoId) {
        Endereco e = enderecoRepository.findById(enderecoId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Endereço"));
        if (!e.getParticipante().getId().equals(participanteId)) {
            throw new AcessoNegadoException();
        }
        enderecoRepository.delete(e);
    }

    // ── Telefone ─────────────────────────────────────────

    @Override
    @Transactional
    public TelefoneResponse adicionarTelefone(Long participanteId, TelefoneRequest req) {
        Participante p = buscarEntidade(participanteId);
        Telefone telefone = Telefone.builder()
                .ddd(req.getDdd()).numero(req.getNumero().replaceAll("[^0-9]", ""))
                .tipo(req.getTipo()).principal(req.getPrincipal() != null ? req.getPrincipal() : false)
                .participante(p)
                .build();
        return mapper.toTelefoneResponse(telefoneRepository.save(telefone));
    }

    @Override
    @Transactional(readOnly = true)
    public List<TelefoneResponse> listarTelefones(Long participanteId) {
        return telefoneRepository.findAllByParticipanteId(participanteId)
                .stream().map(mapper::toTelefoneResponse).toList();
    }

    @Override
    @Transactional
    public void removerTelefone(Long participanteId, Long telefoneId) {
        Telefone t = telefoneRepository.findById(telefoneId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Telefone"));
        if (!t.getParticipante().getId().equals(participanteId)) {
            throw new AcessoNegadoException();
        }
        telefoneRepository.delete(t);
    }

    // ── Helpers ──────────────────────────────────────────

    private Participante buscarEntidade(Long id) {
        return participanteRepository.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Participante"));
    }

    private void validarEmailECpfUnicos(String email, String cpf) {
        if (participanteRepository.existsByEmail(email.toLowerCase().trim())) {
            throw new ConflictException("E-mail já cadastrado.");
        }
        if (participanteRepository.existsByCpf(cpf.replaceAll("[^0-9]", ""))) {
            throw new ConflictException("CPF já cadastrado.");
        }
    }

    private void validarInstituicao(Long instituicaoId) {
        try {
            var resp = institutionClient.buscarPorId(instituicaoId);
            if (resp == null || resp.getDados() == null) {
                throw new RecursoNaoEncontradoException("Instituicao");
            }
        } catch (RecursoNaoEncontradoException e) {
            throw e;
        } catch (Exception e) {
            log.warn("Institution-service indisponivel ao validar id={}: {}", instituicaoId, e.getMessage());
            // Aceita o ID mesmo se o servico estiver fora (tolerancia a falhas)
        }
    }
}