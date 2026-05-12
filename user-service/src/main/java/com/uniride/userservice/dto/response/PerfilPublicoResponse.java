package com.uniride.userservice.dto.response;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class PerfilPublicoResponse {

    private Long id;
    private String nome;              // nome + sobrenome ou nome social
    private String username;          // identificador público @username
    private String fotoPerfil;        // URL ou base64 da foto
    private String instituicao;       // nome da instituição
    private String tipo;              // PASSAGEIRO ou MOTORISTA
    private Double avaliacaoMedia;    // calculada pelo ride-service futuramente
    private Boolean verificado;       // comprovante de matrícula validado
    private String miniBiografia;     // texto de apresentação
    private List<String> preferencias; // nomes das preferências cadastradas

    // Presentes apenas em buscas contextualizadas (buscarNaInstituicao)
    private String statusAmizade;  // NENHUMA | PENDENTE_ENVIADA | PENDENTE_RECEBIDA | ACEITA | BLOQUEADA
    private Long amizadeId;        // id do registro de amizade (para aceitar/recusar sem nova query)

    // Presente no perfil público individual (buscarPerfilPublico*)
    private Integer totalAmigos;
}
