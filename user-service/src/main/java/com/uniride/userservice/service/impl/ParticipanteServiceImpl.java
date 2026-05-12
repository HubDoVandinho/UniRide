package com.uniride.userservice.service.impl;

import com.uniride.userservice.client.ApiClientResponse;
import com.uniride.userservice.client.dto.ValidacaoDominioClientResponse;
import com.uniride.userservice.dto.request.*;
import com.uniride.userservice.dto.response.*;
import com.uniride.userservice.entity.*;
import com.uniride.userservice.enums.StatusParticipante;
import com.uniride.userservice.exception.*;
import com.uniride.userservice.entity.ParticipantePreferencia;
import com.uniride.userservice.repository.*;
import com.uniride.userservice.client.InstitutionClient;
import com.uniride.userservice.dto.response.TipoPreferenciaResponse;
import com.uniride.userservice.service.ParticipanteMapper;
import com.uniride.userservice.service.ParticipanteService;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Random;
import java.util.UUID;

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
    private final TipoPreferenciaRepository tipoPreferenciaRepository;
    private final ParticipantePreferenciaRepository participantePreferenciaRepository;
    private final AmizadeRepository amizadeRepository;
    private final InstitutionClient institutionClient;
    private final PasswordEncoder passwordEncoder;
    private final ParticipanteMapper mapper;
    private final com.uniride.userservice.service.EmailService emailService;
    private final com.uniride.userservice.service.NotificationService notificationService;
    private final EntityManager entityManager;

    // ── Cadastro ─────────────────────────────────────────

    @Override
    @Transactional
    public ParticipanteResponse cadastrarMotorista(CadastroMotoristaRequest req) {
        validarEmailsECpfUnicos(req.getEmailPessoal(), req.getEmailInstitucional(), req.getCpf());

        if (motoristaRepository.existsByCnh(req.getCnh())) {
            throw new ConflictException("CNH já cadastrada.");
        }

        String dominio = extrairDominio(req.getEmailInstitucional());
        Long instituicaoId = validarDominioInstitucional(dominio, req.getInstituicaoId());

        Motorista motorista = new Motorista();
        motorista.setNome(req.getNome().trim());
        motorista.setUsername(resolverUsername(req.getUsername(), req.getNome()));
        motorista.setEmailPessoal(req.getEmailPessoal().toLowerCase().trim());
        motorista.setEmailInstitucional(req.getEmailInstitucional().toLowerCase().trim());
        motorista.setSenhaHash(passwordEncoder.encode(req.getSenha()));
        motorista.setCpf(req.getCpf().replaceAll("[^0-9]", ""));
        motorista.setCnh(req.getCnh());
        motorista.setMiniBiografia(req.getMiniBiografia());
        motorista.setAprovadoAdmin(false);
        motorista.setTotalCaronasOferecidas(0);
        motorista.setInstituicaoId(instituicaoId);
        motorista.setStatus(StatusParticipante.PENDENTE_VERIFICACAO);
        gerarTokenConfirmacao(motorista);

        Motorista salvo = motoristaRepository.save(motorista);
        salvarEndereco(req.getEndereco(), salvo);
        log.info("Motorista cadastrado (pendente): id={}, emailPessoal={}", salvo.getId(), salvo.getEmailPessoal());
        emailService.enviarConfirmacaoCadastro(salvo.getEmailInstitucional(), salvo.getNome(), salvo.getTokenConfirmacao());
        return mapper.toResponse(salvo);
    }

    @Override
    @Transactional
    public ParticipanteResponse cadastrarPassageiro(CadastroPassageiroRequest req) {
        validarEmailsECpfUnicos(req.getEmailPessoal(), req.getEmailInstitucional(), req.getCpf());

        String dominio = extrairDominio(req.getEmailInstitucional());
        Long instituicaoId = validarDominioInstitucional(dominio, req.getInstituicaoId());

        Passageiro passageiro = new Passageiro();
        passageiro.setNome(req.getNome().trim());
        passageiro.setUsername(resolverUsername(req.getUsername(), req.getNome()));
        passageiro.setEmailPessoal(req.getEmailPessoal().toLowerCase().trim());
        passageiro.setEmailInstitucional(req.getEmailInstitucional().toLowerCase().trim());
        passageiro.setSenhaHash(passwordEncoder.encode(req.getSenha()));
        passageiro.setCpf(req.getCpf().replaceAll("[^0-9]", ""));
        passageiro.setNecessidadesEspeciais(req.getNecessidadesEspeciais());
        passageiro.setMiniBiografia(req.getMiniBiografia());
        passageiro.setTotalCaronasSolicitadas(0);
        passageiro.setInstituicaoId(instituicaoId);
        passageiro.setStatus(StatusParticipante.PENDENTE_VERIFICACAO);
        gerarTokenConfirmacao(passageiro);

        Passageiro salvo = passageiroRepository.save(passageiro);
        salvarEndereco(req.getEndereco(), salvo);
        log.info("Passageiro cadastrado (pendente): id={}, emailPessoal={}", salvo.getId(), salvo.getEmailPessoal());
        emailService.enviarConfirmacaoCadastro(salvo.getEmailInstitucional(), salvo.getNome(), salvo.getTokenConfirmacao());
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
        if (req.getUsername() != null) {
            String novoUsername = req.getUsername().toLowerCase().trim();
            if (!novoUsername.equals(p.getUsername()) && participanteRepository.existsByUsername(novoUsername)) {
                throw new ConflictException("Username @" + novoUsername + " já está em uso.");
            }
            p.setUsername(novoUsername);
        }

        if (req.getInstituicaoId() != null) {
            validarInstituicao(req.getInstituicaoId());
            p.setInstituicaoId(req.getInstituicaoId());
        }

        if (req.getValidadeCnh() != null && p instanceof Motorista motorista) {
            motorista.setValidadeCnh(LocalDate.parse(req.getValidadeCnh()));
        }

        if (req.getFotoPerfilUrl() != null) p.setFotoPerfilUrl(req.getFotoPerfilUrl());

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
    @Transactional
    public void apagarConta(Long id, String senha) {
        Participante p = buscarEntidade(id);

        if (!passwordEncoder.matches(senha, p.getSenhaHash())) {
            throw new AcessoNegadoException();
        }

        // 1. Remove todos os vínculos de amizade (enviados e recebidos)
        amizadeRepository.deleteAllByParticipanteId(id);

        // 2. Remove preferências globais do participante
        participantePreferenciaRepository.deleteAllByParticipanteId(id);

        // 3. Remove TipoPreferencia custom criadas por este participante
        List<TipoPreferencia> customTipos = tipoPreferenciaRepository.findAllByCriadoPorParticipanteId(id);
        if (!customTipos.isEmpty()) {
            tipoPreferenciaRepository.deleteAll(customTipos);
        }

        // 4. Remove o participante (cascade: endereços, telefones, veículos)
        participanteRepository.delete(p);
        log.info("Conta apagada permanentemente: participanteId={}", id);
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
        Motorista atualizado = motoristaRepository.findById(motoristaId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Motorista"));
        return mapper.toResponse(atualizado);
    }

    @Override
    @Transactional
    public ParticipanteResponse atualizarVeiculo(Long motoristaId, Long veiculoId, CadastroVeiculoRequest req) {
        Veiculo veiculo = veiculoRepository.findById(veiculoId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Veículo"));

        if (!veiculo.getMotorista().getId().equals(motoristaId)) {
            throw new AcessoNegadoException();
        }

        String novaPlaca = req.getPlaca().toUpperCase();
        if (!veiculo.getPlaca().equals(novaPlaca) && veiculoRepository.existsByPlaca(novaPlaca)) {
            throw new ConflictException("Placa já cadastrada para outro veículo.");
        }

        veiculo.setPlaca(novaPlaca);
        veiculo.setTipo(req.getTipo());
        veiculo.setModelo(req.getModelo());
        veiculo.setMarca(req.getMarca());
        veiculo.setAno(req.getAno());
        veiculo.setCor(req.getCor());
        veiculo.setCapacidade(req.getCapacidade());
        veiculo.setTemSeguro(req.getTemSeguro() != null ? req.getTemSeguro() : false);
        veiculo.setAcessivel(req.getAcessivel() != null ? req.getAcessivel() : false);
        veiculo.setTipoCombustivel(req.getTipoCombustivel());
        veiculo.setQtdPortas(req.getQtdPortas());
        veiculo.setCilindrada(req.getCilindrada());
        veiculo.setTemBauleto(req.getTemBauleto());

        veiculoRepository.save(veiculo);
        Motorista motorista = motoristaRepository.findById(motoristaId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Motorista"));
        return mapper.toResponse(motorista);
    }

    @Override
    @Transactional(readOnly = true)
    public List<VeiculoResponse> listarVeiculos(Long motoristaId) {
        return veiculoRepository.findAllByMotoristaId(motoristaId)
                .stream().map(mapper::toVeiculoResponse).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public VeiculoResponse buscarVeiculo(Long motoristaId) {
        Veiculo v = veiculoRepository.findFirstByMotoristaId(motoristaId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Veículo"));
        return mapper.toVeiculoResponse(v);
    }

    @Override
    @Transactional
    public void removerVeiculo(Long motoristaId, Long veiculoId) {
        Veiculo veiculo = veiculoRepository.findById(veiculoId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Veículo"));
        if (!veiculo.getMotorista().getId().equals(motoristaId)) {
            throw new AcessoNegadoException();
        }
        veiculoRepository.delete(veiculo);
    }

    // ── Endereço ─────────────────────────────────────────

    @Override
    @Transactional
    public EnderecoResponse adicionarEndereco(Long participanteId, EnderecoRequest req) {
        Participante p = buscarEntidade(participanteId);
        Endereco endereco = Endereco.builder()
                .nome(req.getNome()).rua(req.getRua()).numero(req.getNumero()).bairro(req.getBairro())
                .cep(req.getCep().replaceAll("[^0-9]", ""))
                .cidade(req.getCidade()).estado(req.getEstado().toUpperCase())
                .lat(req.getLat()).lng(req.getLng())
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

    // ── Foto de perfil ────────────────────────────────────

    @Override
    @Transactional
    public ParticipanteResponse atualizarFotoPerfil(Long id, String url) {
        Participante p = buscarEntidade(id);
        p.setFotoPerfilUrl(url);
        return mapper.toResponse(participanteRepository.save(p));
    }

    // ── Verificação ───────────────────────────────────────

    @Override
    @Transactional
    public void verificarParticipante(Long id) {
        Participante p = buscarEntidade(id);
        p.setVerificado(true);
        participanteRepository.save(p);
        log.info("Participante id={} verificado.", id);
    }

    @Override
    @Transactional
    public void desverificarParticipante(Long id) {
        Participante p = buscarEntidade(id);
        p.setVerificado(false);
        participanteRepository.save(p);
        log.info("Participante id={} desverificado.", id);
    }

    @Override
    @Transactional
    public void ativarConta(Long id) {
        Participante p = buscarEntidade(id);
        p.setStatus(StatusParticipante.ATIVO);
        p.setVerificado(true);
        participanteRepository.save(p);
        log.info("Participante id={} ativado manualmente pelo admin.", id);
    }

    // ── Avaliação ─────────────────────────────────────────

    @Override
    @Transactional
    public void atualizarMediaAvaliacoes(Long id, Double media) {
        Participante p = buscarEntidade(id);
        p.setMediaAvaliacoes(media);
        participanteRepository.save(p);
        log.info("Media de avaliações atualizada: participanteId={}, media={}", id, media);
    }

    // ── Helpers ──────────────────────────────────────────

    private Participante buscarEntidade(Long id) {
        return participanteRepository.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Participante"));
    }

    @Override
    public boolean usernameDisponivel(String username) {
        return !participanteRepository.existsByUsername(username);
    }

    private void validarEmailsECpfUnicos(String emailPessoal, String emailInstitucional, String cpf) {
        if (participanteRepository.existsByEmailPessoal(emailPessoal.toLowerCase().trim())) {
            throw new ConflictException("E-mail pessoal já cadastrado.");
        }
        if (participanteRepository.existsByEmailInstitucional(emailInstitucional.toLowerCase().trim())) {
            throw new ConflictException("E-mail institucional já cadastrado.");
        }
        String cpfLimpo = cpf.replaceAll("[^0-9]", "");
        participanteRepository.findByCpf(cpfLimpo).ifPresent(existente -> {
            if (existente.getStatus() == StatusParticipante.SUSPENSO) {
                throw new BusinessException("Este CPF está associado a uma conta suspensa. Entre em contato: suporte@uniride.com");
            }
            throw new ConflictException("CPF já cadastrado.");
        });
    }

    /**
     * Valida que o domínio do e-mail institucional pertence à instituição informada e está ativa.
     * Retorna o id da instituição para persistir na entidade.
     */
    private Long validarDominioInstitucional(String dominio, Long instituicaoId) {
        try {
            ApiClientResponse<ValidacaoDominioClientResponse> resp =
                    institutionClient.validarDominio(dominio);

            if (resp == null || resp.getDados() == null || !resp.getDados().isValido()) {
                throw new DominioInstitucionalInvalidoException(
                        "Domínio @" + dominio + " não pertence a nenhuma instituição ativa cadastrada.");
            }

            ValidacaoDominioClientResponse dados = resp.getDados();

            // Verifica consistência: o domínio deve pertencer à instituição que o usuário informou
            if (!dados.getInstituicaoId().equals(instituicaoId)) {
                throw new DominioInstitucionalInvalidoException(
                        "O domínio @" + dominio + " pertence à instituição id=" + dados.getInstituicaoId() +
                        ", mas a instituição informada foi id=" + instituicaoId + ".");
            }

            return dados.getInstituicaoId();

        } catch (DominioInstitucionalInvalidoException e) {
            throw e;
        } catch (Exception e) {
            log.warn("Institution-service indisponivel ao validar dominio={}: {}", dominio, e.getMessage());
            // Tolerância a falhas: aceita o ID informado se o serviço estiver fora
            return instituicaoId;
        }
    }

    private String extrairDominio(String email) {
        int at = email.indexOf('@');
        if (at < 0) throw new ConflictException("E-mail institucional inválido.");
        return email.substring(at + 1).toLowerCase().trim();
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
        }
    }

    // ── Preferências ─────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public List<TipoPreferenciaResponse> listarPreferencias(Long participanteId) {
        return participantePreferenciaRepository.findAllByParticipanteId(participanteId)
                .stream()
                .map(pp -> TipoPreferenciaResponse.builder()
                        .id(pp.getTipoPreferencia().getId())
                        .nome(pp.getTipoPreferencia().getNome())
                        .descricao(pp.getTipoPreferencia().getDescricao())
                        .custom(pp.getTipoPreferencia().getCriadoPorParticipanteId() != null)
                        .build())
                .toList();
    }

    @Override
    @Transactional
    public void atualizarPreferencias(Long participanteId, List<Long> tipoIds) {
        buscarEntidade(participanteId);
        // Remove apenas as preferências globais — as custom são gerenciadas por endpoints próprios
        participantePreferenciaRepository.deleteGlobaisByParticipanteId(participanteId);
        tipoIds.stream()
                .filter(id -> id != null && tipoPreferenciaRepository.existsById(id))
                // Garante que não tenta inserir IDs de preferências custom (já gerenciadas separadamente)
                .filter(id -> tipoPreferenciaRepository.findById(id)
                        .map(t -> t.getCriadoPorParticipanteId() == null).orElse(false))
                .map(id -> {
                    ParticipantePreferencia pp = new ParticipantePreferencia();
                    pp.setParticipanteId(participanteId);
                    pp.setTipoPreferenciaId(id);
                    return pp;
                })
                .forEach(participantePreferenciaRepository::save);
        log.info("Preferencias globais atualizadas: participanteId={}, total={}", participanteId, tipoIds.size());
    }

    @Override
    @Transactional
    public TipoPreferenciaResponse criarPreferenciaCustom(Long participanteId, String nome) {
        String nomeTrimmed = nome.trim();
        if (nomeTrimmed.isEmpty() || nomeTrimmed.length() > 20)
            throw new BusinessException("O nome da preferência deve ter entre 1 e 20 caracteres.");
        if (tipoPreferenciaRepository.countByCriadoPorParticipanteId(participanteId) >= 10)
            throw new BusinessException("Limite de 10 preferências personalizadas atingido.");
        if (tipoPreferenciaRepository.existsByNomeIgnoreCaseAndCriadoPorParticipanteId(nomeTrimmed, participanteId))
            throw new BusinessException("Você já tem uma preferência com esse nome.");

        TipoPreferencia tipo = TipoPreferencia.builder()
                .nome(nomeTrimmed)
                .ativo(true)
                .destinatario("AMBOS")
                .criadoPorParticipanteId(participanteId)
                .build();
        tipo = tipoPreferenciaRepository.save(tipo);

        ParticipantePreferencia pp = new ParticipantePreferencia();
        pp.setParticipanteId(participanteId);
        pp.setTipoPreferenciaId(tipo.getId());
        participantePreferenciaRepository.save(pp);

        log.info("Preferencia custom criada: participanteId={} nome={}", participanteId, nomeTrimmed);
        return TipoPreferenciaResponse.builder()
                .id(tipo.getId()).nome(tipo.getNome()).custom(true).build();
    }

    @Override
    @Transactional
    public void deletarPreferenciaCustom(Long participanteId, Long tipoId) {
        TipoPreferencia tipo = tipoPreferenciaRepository.findById(tipoId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Preferência"));
        if (!participanteId.equals(tipo.getCriadoPorParticipanteId()))
            throw new BusinessException("Você não tem permissão para remover esta preferência.");

        // Remove o vínculo e o tipo
        ParticipantePreferenciaId pk = new ParticipantePreferenciaId(participanteId, tipoId);
        participantePreferenciaRepository.deleteById(pk);
        tipoPreferenciaRepository.deleteById(tipoId);
        log.info("Preferencia custom deletada: participanteId={} tipoId={}", participanteId, tipoId);
    }

    private void salvarEndereco(EnderecoRequest req, Participante participante) {
        Endereco endereco = Endereco.builder()
                .nome(req.getNome()).rua(req.getRua()).numero(req.getNumero()).bairro(req.getBairro())
                .cep(req.getCep().replaceAll("[^0-9]", ""))
                .cidade(req.getCidade()).estado(req.getEstado().toUpperCase())
                .lat(req.getLat()).lng(req.getLng())
                .participante(participante)
                .build();
        enderecoRepository.save(endereco);
    }

    private String resolverUsername(String usernameInformado, String nome) {
        if (usernameInformado != null && !usernameInformado.isBlank()) {
            String candidato = usernameInformado.toLowerCase().trim();
            if (participanteRepository.existsByUsername(candidato)) {
                throw new ConflictException("Username @" + candidato + " já está em uso.");
            }
            return candidato;
        }

        // "João Rodrigues de Arruda" → "joao.rod"
        String[] partes = nome.trim().split("\\s+");
        String primeiro = normalizarParteUsername(partes[0]);

        String sobrenome = "";
        for (int i = 1; i < partes.length; i++) {
            String p = normalizarParteUsername(partes[i]);
            if (!p.matches("de|da|do|dos|das|e")) {
                sobrenome = p;
                break;
            }
        }

        String base;
        if (!sobrenome.isBlank()) {
            String sob = sobrenome.length() >= 3 ? sobrenome.substring(0, 3) : sobrenome;
            base = primeiro + "." + sob;
        } else {
            base = primeiro;
        }

        if (base.length() < 3) base = base + "user";

        if (!participanteRepository.existsByUsername(base)) return base;

        Random random = new Random();
        for (int i = 0; i < 10; i++) {
            String candidato = base + (random.nextInt(9000) + 1000);
            if (!participanteRepository.existsByUsername(candidato)) return candidato;
        }

        return base + UUID.randomUUID().toString().replace("-", "").substring(0, 4);
    }

    private String normalizarParteUsername(String s) {
        return Normalizer.normalize(s, Normalizer.Form.NFD)
                .replaceAll("\\p{InCombiningDiacriticalMarks}+", "")
                .toLowerCase()
                .replaceAll("[^a-z0-9]", "");
    }

    private void gerarTokenConfirmacao(Participante p) {
        p.setTokenConfirmacao(UUID.randomUUID().toString().replace("-", ""));
        p.setTokenConfirmacaoExpiraEm(LocalDateTime.now().plusHours(48));
    }

    // ── Push notifications ────────────────────────────────────────────────────

    @Override
    @Transactional
    public void salvarPushToken(Long participanteId, String pushToken) {
        Participante p = buscarEntidade(participanteId);
        p.setPushToken(pushToken != null ? pushToken.trim() : null);
        participanteRepository.save(p);
        log.info("Push token salvo para participante id={}", participanteId);
    }

    @Override
    @Transactional(readOnly = true)
    public String buscarPushToken(Long participanteId) {
        return participanteRepository.findById(participanteId)
                .map(Participante::getPushToken)
                .orElse(null);
    }

    // ── Moderação ─────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public void suspenderConta(Long id) {
        Participante p = buscarEntidade(id);
        p.setStatus(StatusParticipante.SUSPENSO);
        participanteRepository.save(p);
        if (p.getPushToken() != null && !p.getPushToken().isBlank()) {
            notificationService.enviar(
                p.getPushToken(),
                "Conta suspensa",
                "Sua conta foi suspensa. Se acredita que foi um engano, entre em contato: suporte@uniride.com",
                java.util.Map.of("tipo", "CONTA_SUSPENSA")
            );
        }
        log.info("Conta suspensa pelo admin: participanteId={}", id);
    }

    @Override
    @Transactional
    public void dessuspenderConta(Long id) {
        Participante p = buscarEntidade(id);
        p.setStatus(StatusParticipante.ATIVO);
        participanteRepository.save(p);
        log.info("Conta dessuspensa pelo admin: participanteId={}", id);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ParticipanteResponse> listarMotoristasNaoAprovados(Pageable pageable) {
        return motoristaRepository.findMotoristasNaoAprovados(pageable).map(mapper::toResponse);
    }

    @Override
    @Transactional
    public void aprovarMotorista(Long id) {
        Motorista motorista = motoristaRepository.findById(id)
            .orElseThrow(() -> new RecursoNaoEncontradoException("Motorista"));

        if (Boolean.TRUE.equals(motorista.getAprovadoAdmin())) {
            throw new BusinessException("Motorista já está aprovado.");
        }

        motorista.setAprovadoAdmin(true);
        motoristaRepository.save(motorista);

        if (motorista.getPushToken() != null && !motorista.getPushToken().isBlank()) {
            notificationService.enviar(
                motorista.getPushToken(),
                "Perfil de motorista aprovado!",
                "Sua CNH foi verificada. Agora você pode oferecer caronas!",
                java.util.Map.of("tipo", "MOTORISTA_APROVADO")
            );
        }
        log.info("Motorista id={} aprovado pelo admin.", id);
    }

    @Override
    @Transactional
    public void rejeitarMotorista(Long id, String motivo) {
        Motorista motorista = motoristaRepository.findById(id)
            .orElseThrow(() -> new RecursoNaoEncontradoException("Motorista"));

        if (Boolean.TRUE.equals(motorista.getAprovadoAdmin())) {
            throw new BusinessException("Não é possível rejeitar um motorista já aprovado.");
        }

        String pushToken = motorista.getPushToken();

        entityManager.createNativeQuery(
            "UPDATE participantes SET dtype = 'PASSAGEIRO' WHERE id = :id"
        ).setParameter("id", id).executeUpdate();
        entityManager.flush();
        entityManager.clear();

        if (pushToken != null && !pushToken.isBlank()) {
            String corpo = (motivo != null && !motivo.isBlank())
                ? "Motivo: " + motivo + ". Você pode tentar novamente com os dados corretos."
                : "Sua documentação não atendeu aos critérios. Entre em contato: suporte@uniride.com";
            notificationService.enviar(
                pushToken,
                "Solicitação de motorista rejeitada",
                corpo,
                java.util.Map.of("tipo", "MOTORISTA_REJEITADO")
            );
        }
        log.info("Solicitação de motorista rejeitada pelo admin: participanteId={}", id);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean cpfJaSuspenso(String cpf) {
        String cpfLimpo = cpf.replaceAll("[^0-9]", "");
        return participanteRepository.findByCpf(cpfLimpo)
                .map(p -> p.getStatus() == StatusParticipante.SUSPENSO)
                .orElse(false);
    }
}