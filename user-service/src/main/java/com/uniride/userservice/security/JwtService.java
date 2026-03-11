package com.uniride.userservice.security;

import com.uniride.userservice.entity.Participante;
import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Service
@Slf4j
public class JwtService {

    private final SecretKey secretKey;
    private final long expirationMs;

    public JwtService(
            @Value("${jwt.secret}") String secret,
            @Value("${jwt.expiration-ms}") long expirationMs) {
        this.secretKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expirationMs = expirationMs;
    }

    public String gerarToken(Participante participante) {
        String tipo = participante.getClass().getSimpleName().toUpperCase();
        return Jwts.builder()
                .subject(participante.getEmail())
                .claim("userId", participante.getId())
                .claim("tipo", tipo)
                .claim("role", "ROLE_" + tipo)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + expirationMs))
                .signWith(secretKey)
                .compact();
    }

    public String extrairEmail(String token) {
        return parsearClaims(token).getSubject();
    }

    public Long extrairUserId(String token) {
        return parsearClaims(token).get("userId", Long.class);
    }

    public String extrairRole(String token) {
        return parsearClaims(token).get("role", String.class);
    }

    public boolean validarToken(String token) {
        try {
            parsearClaims(token);
            return true;
        } catch (ExpiredJwtException e) {
            log.warn("JWT expirado");
        } catch (JwtException | IllegalArgumentException e) {
            log.warn("JWT inválido: {}", e.getMessage());
        }
        return false;
    }

    private Claims parsearClaims(String token) {
        return Jwts.parser()
                .verifyWith(secretKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
