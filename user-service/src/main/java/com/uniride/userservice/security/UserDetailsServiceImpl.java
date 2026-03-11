package com.uniride.userservice.security;

import com.uniride.userservice.entity.Participante;
import com.uniride.userservice.repository.ParticipanteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.*;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserDetailsServiceImpl implements UserDetailsService {

    private final ParticipanteRepository participanteRepository;

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        Participante participante = participanteRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("Usuário não encontrado: " + email));

        String role = "ROLE_" + participante.getClass().getSimpleName().toUpperCase();
        boolean bloqueado = participante.getStatus().name().equals("SUSPENSO");
        boolean desativado = participante.getStatus().name().equals("INATIVO");

        return User.builder()
                .username(participante.getEmail())
                .password(participante.getSenhaHash())
                .authorities(List.of(new SimpleGrantedAuthority(role)))
                .accountLocked(bloqueado)
                .disabled(desativado)
                .build();
    }
}
