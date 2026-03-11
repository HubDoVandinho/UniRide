package com.uniride.userservice.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

@Configuration
public class AppConfig {

    @Value("${rate-limit.max-tentativas:5}")
    private int maxTentativas;

    @Value("${rate-limit.janela-minutos:15}")
    private int janelaMinutos;

    public int getMaxTentativas() { return maxTentativas; }
    public int getJanelaMinutos() { return janelaMinutos; }
}
