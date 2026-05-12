package com.uniride.userservice.service;

import com.uniride.userservice.dto.request.LoginRequest;
import com.uniride.userservice.dto.request.RefreshTokenRequest;
import com.uniride.userservice.dto.response.AuthResponse;

public interface AuthService {
    AuthResponse login(LoginRequest request, String ipOrigem);
    AuthResponse refreshToken(RefreshTokenRequest request);
    void logout(Long participanteId);
    void confirmarEmailInstitucional(String token);
    void solicitarRecuperacaoSenha(String email);
    void redefinirSenha(String codigo, String novaSenha);
    void reenviarVerificacao(String email);
}
