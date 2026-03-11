package com.uniride.userservice.service.impl;

import com.uniride.userservice.dto.request.LoginRequest;
import com.uniride.userservice.dto.request.RefreshTokenRequest;
import com.uniride.userservice.dto.response.AuthResponse;
import com.uniride.userservice.entity.RefreshToken;
import com.uniride.userservice.entity.Participante;
import com.uniride.userservice.exception.CredenciaisInvalidasException;
import com.uniride.userservice.exception.TokenInvalidoException;
import com.uniride.userservice.repository.ParticipanteRepository;
import com.uniride.userservice.repository.RefreshTokenRepository;
import com.uniride.userservice.security.JwtService;
import com.uniride.userservice.service.AuthService;
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

    @Value("${jwt.expiration-ms}") private long expirationMs;
    @Value("${jwt.refresh-expiration-ms}") private long refreshExpirationMs;

    @Override
    @Transactional
    public AuthResponse login(LoginRequest request, String ipOrigem) {
        String email = request.getEmail().toLowerCase().trim();

        // Verifica rate limit ANTES de autenticar
        rateLimitService.verificarBloqueio(email, ipOrigem);

        Participante participante = participanteRepository.findAtivoByEmail(email)
                .orElseThrow(() -> {
                    rateLimitService.registrarTentativa(email, ipOrigem, false);
                    return new CredenciaisInvalidasException();
                });

        if (!passwordEncoder.matches(request.getSenha(), participante.getSenhaHash())) {
            rateLimitService.registrarTentativa(email, ipOrigem, false);
            throw new CredenciaisInvalidasException();
        }

        rateLimitService.registrarTentativa(email, ipOrigem, true);

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

        Participante participante = rt.getParticipante();
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