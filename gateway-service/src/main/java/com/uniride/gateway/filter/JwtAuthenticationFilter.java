package com.uniride.gateway.filter;

import io.jsonwebtoken.Claims;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class JwtAuthenticationFilter implements GlobalFilter, Ordered {

    private final JwtUtil jwtUtil;

    private static final List<String> PUBLIC_PATHS = List.of(
            "/api/v1/auth/login",
            "/api/v1/auth/refresh",
            "/api/v1/auth/confirmar",
            "/api/v1/auth/esqueci-senha",
            "/api/v1/auth/redefinir-senha",
            "/api/v1/participantes/passageiros",
            "/api/v1/participantes/motoristas",
            "/api/v1/instituicoes",
            "/api/v1/amizades/sao-amigos",
            "/api/v1/participantes/by-username",
            "/actuator"
    );

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String path = exchange.getRequest().getURI().getPath();

        boolean isPublic = PUBLIC_PATHS.stream().anyMatch(p ->
                path.equals(p) || path.startsWith(p + "/") || path.startsWith(p + "?")
        );

        if (isPublic) {
            return chain.filter(exchange);
        }

        String authHeader = exchange.getRequest().getHeaders().getFirst(HttpHeaders.AUTHORIZATION);

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            log.warn("Requisicao sem token para path: {}", path);
            exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
            return exchange.getResponse().setComplete();
        }

        String token = authHeader.substring(7);

        if (!jwtUtil.isValid(token)) {
            log.warn("Token invalido para path: {}", path);
            exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
            return exchange.getResponse().setComplete();
        }

        Claims claims = jwtUtil.extractClaims(token);

        String userId = claims.get("userId") != null
                ? String.valueOf(((Number) claims.get("userId")).longValue()) : "";

        String instituicaoId = claims.get("instituicaoId") != null
                ? String.valueOf(((Number) claims.get("instituicaoId")).longValue()) : "";

        ServerHttpRequest mutatedRequest = exchange.getRequest().mutate()
                .header("X-User-Id",        userId)
                .header("X-User-Email",     claims.getSubject())
                .header("X-User-Role",      String.valueOf(claims.get("role")))
                .header("X-User-Tipo",      String.valueOf(claims.get("tipo")))
                .header("X-Instituicao-Id", instituicaoId)
                .build();

        log.debug("Autenticado: userId={}, instituicaoId={}, path={}", userId, instituicaoId, path);

        return chain.filter(exchange.mutate().request(mutatedRequest).build());
    }

    @Override
    public int getOrder() {
        return -1;
    }
}
