package com.uniride.userservice.security.filter;

import com.uniride.userservice.security.JwtService;
import com.uniride.userservice.security.UserDetailsServiceImpl;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@RequiredArgsConstructor
@Slf4j
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserDetailsServiceImpl userDetailsService;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String token = extrairToken(request);
        log.debug("[JWT] path={} token={}", request.getRequestURI(), token == null ? "AUSENTE" : "PRESENTE");

        if (StringUtils.hasText(token) && jwtService.validarToken(token)) {
            String email = jwtService.extrairEmail(token);
            UserDetails userDetails = userDetailsService.loadUserByUsername(email);

            log.debug("[JWT] email={} enabled={} nonLocked={} authorities={}",
                    email, userDetails.isEnabled(), userDetails.isAccountNonLocked(), userDetails.getAuthorities());

            if (!userDetails.isAccountNonLocked()) {
                log.warn("[JWT] Conta suspensa: {}", email);
                response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                response.setContentType("application/json;charset=UTF-8");
                response.getWriter().write("{\"codigo\":\"CONTA_SUSPENSA\",\"mensagem\":\"Sua conta foi suspensa. Entre em contato: suporte@uniride.com\"}");
                return;
            } else if (userDetails.isEnabled()) {
                var auth = new UsernamePasswordAuthenticationToken(
                        userDetails, null, userDetails.getAuthorities());
                auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(auth);
                log.debug("[JWT] Autenticacao definida para: {}", email);
            } else {
                log.warn("[JWT] Autenticacao NEGADA para: {} (enabled={}, nonLocked={})",
                        email, userDetails.isEnabled(), userDetails.isAccountNonLocked());
            }
        } else if (StringUtils.hasText(token)) {
            log.warn("[JWT] Token invalido/expirado para path={}", request.getRequestURI());
        }
        filterChain.doFilter(request, response);
    }

    private String extrairToken(HttpServletRequest request) {
        String bearer = request.getHeader("Authorization");
        if (StringUtils.hasText(bearer) && bearer.startsWith("Bearer ")) {
            return bearer.substring(7).trim();
        }
        return null;
    }
}
