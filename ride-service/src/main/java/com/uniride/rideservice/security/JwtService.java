package com.uniride.rideservice.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;

@Service
public class JwtService {

    private final SecretKey secretKey;

    public JwtService(@Value("${jwt.secret}") String secret) {
        this.secretKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    public Claims parsearClaims(String token) {
        return Jwts.parser().verifyWith(secretKey).build()
                .parseSignedClaims(token).getPayload();
    }

    public Long extrairUserId(String token) {
        Object val = parsearClaims(token).get("userId");
        return val != null ? ((Number) val).longValue() : null;
    }

    public String extrairEmail(String token) {
        return parsearClaims(token).getSubject();
    }

    public String extrairTipo(String token) {
        return parsearClaims(token).get("tipo", String.class);
    }

    public Long extrairInstituicaoId(String token) {
        Object val = parsearClaims(token).get("instituicaoId");
        return val != null ? ((Number) val).longValue() : null;
    }

    public boolean isValido(String token) {
        try { parsearClaims(token); return true; } catch (Exception e) { return false; }
    }
}
