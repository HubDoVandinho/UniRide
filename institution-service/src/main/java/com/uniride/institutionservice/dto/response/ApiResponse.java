package com.uniride.institutionservice.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiResponse<T> {

    private final boolean sucesso;
    private final String mensagem;
    private final T dados;
    private final LocalDateTime timestamp;

    public static <T> ApiResponse<T> ok(String mensagem, T dados) {
        return ApiResponse.<T>builder()
                .sucesso(true)
                .mensagem(mensagem)
                .dados(dados)
                .timestamp(LocalDateTime.now())
                .build();
    }

    public static <T> ApiResponse<T> ok(String mensagem) {
        return ApiResponse.<T>builder()
                .sucesso(true)
                .mensagem(mensagem)
                .timestamp(LocalDateTime.now())
                .build();
    }

    public static <T> ApiResponse<T> erro(String mensagem) {
        return ApiResponse.<T>builder()
                .sucesso(false)
                .mensagem(mensagem)
                .timestamp(LocalDateTime.now())
                .build();
    }

    public static <T> ApiResponse<T> erro(String mensagem, T dados) {
        return ApiResponse.<T>builder()
                .sucesso(false)
                .mensagem(mensagem)
                .dados(dados)
                .timestamp(LocalDateTime.now())
                .build();
    }
}
