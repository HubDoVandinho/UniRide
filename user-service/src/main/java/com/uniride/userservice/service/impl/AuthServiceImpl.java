package com.uniride.userservice.service.impl;

import com.uniride.userservice.dto.request.LoginRequest;
import com.uniride.userservice.dto.request.RefreshTokenRequest;
import com.uniride.userservice.dto.response.AuthResponse;
import com.uniride.userservice.entity.RefreshToken;
import com.uniride.userservice.entity.Participante;
import com.uniride.userservice.enums.StatusParticipante;
import com.uniride.userservice.exception.ContaNaoConfirmadaException;
import com.uniride.userservice.exception.CredenciaisInvalidasException;
import com.uniride.userservice.exception.TokenInvalidoException;
import com.uniride.userservice.repository.ParticipanteRepository;
import com.uniride.userservice.repository.RefreshTokenRepository;
import com.uniride.userservice.security.JwtService;
import com.uniride.userservice.service.AuthService;
import com.uniride.userservice.service.EmailService;
import com.uniride.userservice.service.ParticipanteMapper;
import com.uniride.userservice.service.RateLimitService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Random;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthServiceImpl implements AuthService {

    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final ParticipanteRepository participanteRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final ParticipanteMapper mapper;
    private final RateLimitService rateLimitService;
    private final EmailService emailService;

    @Value("${jwt.expiration-ms}") private long expirationMs;
    @Value("${jwt.refresh-expiration-ms}") private long refreshExpirationMs;

    @Override
    @Transactional
    public AuthResponse login(LoginRequest request, String ipOrigem) {
        final String loginRaw = request.getLogin().toLowerCase().trim();

        // Verifica rate limit ANTES de autenticar
        rateLimitService.verificarBloqueio(loginRaw, ipOrigem);

        // Aceita e-mail pessoal ou @username (com ou sem o @ na frente)
        boolean isUsername = loginRaw.startsWith("@");
        final String identificador = isUsername ? loginRaw.substring(1) : loginRaw;
        boolean isEmail = !isUsername && identificador.contains("@");
        Participante participante = (isEmail
                ? participanteRepository.findByEmailPessoal(identificador)
                : participanteRepository.findByUsername(identificador))
                .orElseThrow(() -> {
                    rateLimitService.registrarTentativa(loginRaw, ipOrigem, false);
                    return new CredenciaisInvalidasException();
                });

        // Senha verificada antes do status — não revelamos "conta existe" para senha errada
        if (!passwordEncoder.matches(request.getSenha(), participante.getSenhaHash())) {
            rateLimitService.registrarTentativa(identificador, ipOrigem, false);
            throw new CredenciaisInvalidasException();
        }

        // Senha correta: agora sim verificamos o status
        if (participante.getStatus() == StatusParticipante.PENDENTE_VERIFICACAO) {
            rateLimitService.registrarTentativa(identificador, ipOrigem, false);
            throw new ContaNaoConfirmadaException();
        }

        if (participante.getStatus() != StatusParticipante.ATIVO) {
            rateLimitService.registrarTentativa(identificador, ipOrigem, false);
            throw new CredenciaisInvalidasException();
        }

        rateLimitService.registrarTentativa(identificador, ipOrigem, true);

        String accessToken = jwtService.gerarToken(participante);
        String refreshToken = criarRefreshToken(participante);

        log.info("Login efetuado: participanteId={}, tipo={}", participante.getId(),
                participante.getClass().getSimpleName());

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .expiresIn(expirationMs / 1000)
                .participante(mapper.toResponse(participante))
                .build();
    }

    @Override
    @Transactional
    public AuthResponse refreshToken(RefreshTokenRequest request) {
        RefreshToken rt = refreshTokenRepository.findByToken(request.getRefreshToken())
                .orElseThrow(TokenInvalidoException::new);

        if (!rt.isValido()) {
            throw new TokenInvalidoException();
        }

        // Rotação: revoga o atual e gera um novo
        rt.setRevogado(true);
        refreshTokenRepository.save(rt);

        // Recarrega via findById para garantir que o subtipo correto (Motorista/Passageiro)
        // seja instanciado — evita que o proxy @ManyToOne retorne a classe-base Participante.
        Participante participante = participanteRepository.findById(rt.getParticipante().getId())
                .orElseThrow(TokenInvalidoException::new);
        String novoRefreshToken = criarRefreshToken(participante);
        String novoAccessToken = jwtService.gerarToken(participante);

        log.info("Token renovado: participanteId={}", participante.getId());

        return AuthResponse.builder()
                .accessToken(novoAccessToken)
                .refreshToken(novoRefreshToken)
                .tokenType("Bearer")
                .expiresIn(expirationMs / 1000)
                .participante(mapper.toResponse(participante))
                .build();
    }

    @Override
    @Transactional
    public void logout(Long participanteId) {
        refreshTokenRepository.revogarTodosPorParticipante(participanteId);
        log.info("Logout: todos os refresh tokens revogados. participanteId={}", participanteId);
    }

    @Override
    @Transactional
    public void confirmarEmailInstitucional(String token) {
        Participante participante = participanteRepository.findByTokenConfirmacao(token)
                .orElseThrow(() -> new TokenInvalidoException());

        if (participante.getTokenConfirmacaoExpiraEm() == null ||
                participante.getTokenConfirmacaoExpiraEm().isBefore(LocalDateTime.now())) {
            throw new TokenInvalidoException();
        }

        participante.setStatus(StatusParticipante.ATIVO);
        participante.setVerificado(true);
        participante.setTokenConfirmacao(null);
        participante.setTokenConfirmacaoExpiraEm(null);
        participanteRepository.save(participante);

        log.info("E-mail institucional confirmado: participanteId={}", participante.getId());
    }

    @Override
    @Transactional
    public void solicitarRecuperacaoSenha(String email) {
        // Por segurança: não revelamos se o e-mail existe ou não
        participanteRepository
                .findByEmailPessoalOrEmailInstitucional(email.toLowerCase().trim(), email.toLowerCase().trim())
                .ifPresent(participante -> {
                    String codigo = String.format("%06d", new Random().nextInt(1_000_000));
                    participante.setTokenResetSenha(codigo);
                    participante.setTokenResetSenhaExpiraEm(LocalDateTime.now().plusMinutes(15));
                    participanteRepository.save(participante);
                    emailService.enviarResetSenha(email.toLowerCase().trim(), participante.getNome(), codigo);
                    log.info("Código de reset enviado para participanteId={}", participante.getId());
                });
    }

    @Override
    @Transactional
    public void redefinirSenha(String codigo, String novaSenha) {
        Participante participante = participanteRepository.findByTokenResetSenha(codigo)
                .orElseThrow(() -> new TokenInvalidoException());

        if (participante.getTokenResetSenhaExpiraEm() == null ||
                participante.getTokenResetSenhaExpiraEm().isBefore(LocalDateTime.now())) {
            throw new TokenInvalidoException();
        }

        participante.setSenhaHash(passwordEncoder.encode(novaSenha));
        participante.setTokenResetSenha(null);
        participante.setTokenResetSenhaExpiraEm(null);
        participanteRepository.save(participante);

        log.info("Senha redefinida: participanteId={}", participante.getId());
    }

    @Override
    @Transactional
    public void reenviarVerificacao(String email) {
        // Por segurança: retorna 200 mesmo se o e-mail não existir ou já estiver ativo
        participanteRepository
                .findByEmailPessoalOrEmailInstitucional(email.toLowerCase().trim(), email.toLowerCase().trim())
                .ifPresent(participante -> {
                    if (participante.getStatus() != StatusParticipante.PENDENTE_VERIFICACAO) return;

                    // Regenera token com validade de 48h
                    participante.setTokenConfirmacao(java.util.UUID.randomUUID().toString().replace("-", ""));
                    participante.setTokenConfirmacaoExpiraEm(LocalDateTime.now().plusHours(48));
                    participanteRepository.save(participante);

                    emailService.enviarConfirmacaoCadastro(
                            participante.getEmailInstitucional(),
                            participante.getNome(),
                            participante.getTokenConfirmacao());

                    log.info("Verificação reenviada: participanteId={}", participante.getId());
                });
    }

    // Limpeza automática toda madrugada às 2h
    @Scheduled(cron = "0 0 2 * * *")
    @Transactional
    public void limparTokensExpirados() {
        refreshTokenRepository.limparExpiradosERevogados(LocalDateTime.now());
        log.info("Refresh tokens expirados/revogados removidos.");
    }

    private String criarRefreshToken(Participante participante) {
        RefreshToken rt = RefreshToken.builder()
                .token(UUID.randomUUID().toString())
                .participante(participante)
                .expiraEm(LocalDateTime.now().plusSeconds(refreshExpirationMs / 1000))
                .revogado(false)
                .build();
        return refreshTokenRepository.save(rt).getToken();
    }
}