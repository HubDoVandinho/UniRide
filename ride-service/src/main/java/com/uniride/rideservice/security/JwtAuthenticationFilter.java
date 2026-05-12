package com.uniride.rideservice.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7);
            try {
                if (jwtService.isValido(token)) {
                    Long userId        = jwtService.extrairUserId(token);
                    String email       = jwtService.extrairEmail(token);
                    String tipo        = jwtService.extrairTipo(token);
                    Long instituicaoId = jwtService.extrairInstituicaoId(token);

                    var auth = new UsernamePasswordAuthenticationToken(
                            email, null,
                            List.of(new SimpleGrantedAuthority("ROLE_" + tipo))
                    );
                    // Guarda userId e instituicaoId no details como array
                    auth.setDetails(new Long[]{userId, instituicaoId});
                    SecurityContextHolder.getContext().setAuthentication(auth);
                } else {
                    log.warn("[JWT] Token inválido ou expirado. path={}", request.getRequestURI());
                }
            } catch (Exception e) {
                log.warn("[JWT] Erro ao processar token: {} path={}", e.getMessage(), request.getRequestURI());
            }
        } else {
            log.debug("[JWT] Sem header Authorization. path={}", request.getRequestURI());
        }
        chain.doFilter(request, response);
    }
}
