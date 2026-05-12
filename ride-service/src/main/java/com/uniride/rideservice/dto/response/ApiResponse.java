package com.uniride.rideservice.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter @Builder @NoArgsConstructor @AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiResponse<T> {
    private boolean sucesso;
    private String mensagem;
    private T dados;
    private LocalDateTime timestamp;

    public static <T> ApiResponse<T> ok(T dados) {
        return ApiResponse.<T>builder().sucesso(true).dados(dados).timestamp(LocalDateTime.now()).build();
    }

    public static <T> ApiResponse<T> ok(String mensagem, T dados) {
        return ApiResponse.<T>builder().sucesso(true).mensagem(mensagem).dados(dados).timestamp(LocalDateTime.now()).build();
    }

    public static ApiResponse<Void> ok(String mensagem) {
        return ApiResponse.<Void>builder().sucesso(true).mensagem(mensagem).timestamp(LocalDateTime.now()).build();
    }
}
