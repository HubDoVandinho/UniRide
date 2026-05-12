package com.uniride.userservice.service;

public interface EmailService {

    void enviarConfirmacaoCadastro(String destinatario, String nomeUsuario, String token);

    void enviarResetSenha(String destinatario, String nomeUsuario, String codigo);
}
