package com.uniride.userservice.config;

import com.uniride.userservice.security.UserDetailsServiceImpl;
import com.uniride.userservice.security.filter.JwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtFilter;
    private final UserDetailsServiceImpl  userDetailsService;

    private static final String[] PUBLIC_POST = {
            "/api/v1/auth/login",
            "/api/v1/auth/refresh",
            "/api/v1/auth/esqueci-senha",
            "/api/v1/auth/redefinir-senha",
            "/api/v1/auth/reenviar-verificacao",
            "/api/v1/participantes/motoristas",
            "/api/v1/participantes/passageiros",
            "/h2-console/**"
    };

    private static final String[] PUBLIC_GET = {
            "/actuator/health",
            "/h2-console/**",
            "/api/v1/auth/confirmar",              // confirmação de e-mail institucional
            "/api/v1/instituicoes",
            "/api/v1/instituicoes/**",
            "/api/v1/participantes/*/perfil",      // perfil público — sem login
            "/api/v1/participantes/by-username/*/perfil", // perfil público via username (deep link)
            "/api/v1/amizades/sao-amigos",                           // Feign interno do ride-service
            "/api/v1/participantes/*/veiculo-info",                  // Feign interno do ride-service
            "/api/v1/participantes/*/perfil-info",                   // Feign interno do ride-service
            "/api/v1/preferencias",                                  // tipos de preferência — público
            "/api/v1/participantes/motoristas/por-preferencias",     // Feign interno do ride-service
            "/api/v1/participantes/verificar-username",              // verificação de disponibilidade no cadastro
            "/api/v1/participantes/*/push-token"                     // Feign interno do ride-service
    };

    private static final String[] PUBLIC_PATCH = {
            "/api/v1/participantes/*/media-avaliacoes" // Feign Client interno do ride-service
    };

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(AbstractHttpConfigurer::disable)
                .headers(h -> h.frameOptions(f -> f.disable()))
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/h2-console/**").permitAll()
                        .requestMatchers(HttpMethod.POST,  PUBLIC_POST).permitAll()
                        .requestMatchers(HttpMethod.GET,   PUBLIC_GET).permitAll()
                        .requestMatchers(HttpMethod.PATCH, PUBLIC_PATCH).permitAll()
                        .requestMatchers("/api/v1/admin/**").hasRole("ADMIN")
                        .anyRequest().authenticated()
                )
                .authenticationProvider(authenticationProvider())
                .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOriginPatterns(List.of("*")); // ← permite qualquer origem
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }

    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder());
        return provider;
    }

    @Bean
    public AuthenticationManager authenticationManager() {
        return new ProviderManager(authenticationProvider());
    }
}