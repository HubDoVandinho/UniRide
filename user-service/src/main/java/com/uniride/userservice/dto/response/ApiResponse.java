package com.uniride.userservice.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data @Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiResponse<T> {

    private boolean sucesso;
    private String mensagem;
    private T dados;
    private LocalDateTime timestamp;

    public static <T> ApiResponse<T> ok(String mensagem, T dados) {
        return ApiResponse.<T>builder()
                .sucesso(true).mensagem(mensagem).dados(dados)
                .timestamp(LocalDateTime.now()).build();
    }

    public static <T> ApiResponse<T> ok(String mensagem) {
        return ApiResponse.<T>builder()
                .sucesso(true).mensagem(mensagem)
                .timestamp(LocalDateTime.now()).build();
    }

    public static <T> ApiResponse<T> erro(String mensagem) {
        return ApiResponse.<T>builder()
                .sucesso(false).mensagem(mensagem)
                .timestamp(LocalDateTime.now()).build();
    }
}
