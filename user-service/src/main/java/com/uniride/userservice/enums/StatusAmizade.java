package com.uniride.userservice.enums;

public enum StatusAmizade {
    PENDENTE,   // solicitação enviada, aguardando resposta
    ACEITA,     // amizade confirmada — agenda visível mutuamente
    RECUSADA,   // destinatário recusou (solicitante não é notificado)
    BLOQUEADA   // destinatário bloqueou — solicitante não pode reenviar
}
