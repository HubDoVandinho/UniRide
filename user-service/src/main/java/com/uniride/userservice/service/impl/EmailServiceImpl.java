package com.uniride.userservice.service.impl;

import com.uniride.userservice.service.EmailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailServiceImpl implements EmailService {

    private final JavaMailSender mailSender;

    @Value("${app.url}")
    private String appUrl;

    @Override
    @Async
    public void enviarConfirmacaoCadastro(String destinatario, String nomeUsuario, String token) {
        String link = appUrl + "/api/v1/auth/confirmar?token=" + token;

        SimpleMailMessage mensagem = new SimpleMailMessage();
        mensagem.setTo(destinatario);
        mensagem.setSubject("UniRide — Confirme seu cadastro");
        mensagem.setText(
                "Olá, " + nomeUsuario + "!\n\n" +
                "Clique no link abaixo para confirmar seu e-mail institucional e ativar sua conta:\n\n" +
                link + "\n\n" +
                "O link expira em 48 horas.\n\n" +
                "Caso não tenha feito esse cadastro, ignore este e-mail.\n\n" +
                "— Equipe UniRide"
        );

        try {
            mailSender.send(mensagem);
            log.info("E-mail de confirmação enviado para {}", destinatario);
        } catch (MailException e) {
            log.error("Falha ao enviar e-mail de confirmação para {}: {}", destinatario, e.getMessage());
        }
    }

    @Override
    @Async
    public void enviarResetSenha(String destinatario, String nomeUsuario, String codigo) {
        SimpleMailMessage mensagem = new SimpleMailMessage();
        mensagem.setTo(destinatario);
        mensagem.setSubject("UniRide — Redefinição de senha");
        mensagem.setText(
                "Olá, " + nomeUsuario + "!\n\n" +
                "Seu código para redefinir a senha é:\n\n" +
                "  " + codigo + "\n\n" +
                "Digite este código no app. Ele expira em 15 minutos.\n\n" +
                "Se você não solicitou a redefinição de senha, ignore este e-mail.\n\n" +
                "— Equipe UniRide"
        );

        try {
            mailSender.send(mensagem);
            log.info("E-mail de reset de senha enviado para {}", destinatario);
        } catch (MailException e) {
            log.error("Falha ao enviar e-mail de reset para {}: {}", destinatario, e.getMessage());
        }
    }
}
