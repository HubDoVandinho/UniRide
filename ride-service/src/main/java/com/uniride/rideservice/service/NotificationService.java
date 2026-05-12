package com.uniride.rideservice.service;

import com.uniride.rideservice.client.UserServiceClient;
import feign.FeignException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

@Service
@Slf4j
@RequiredArgsConstructor
public class NotificationService {

    private static final String EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

    private final UserServiceClient userServiceClient;
    private final RestTemplate restTemplate = new RestTemplate();

    /**
     * Busca o push token do participante via Feign e envia uma notificação Expo.
     * Falhas são silenciosas — nunca interrompem o fluxo principal.
     */
    public void notificar(Long participanteId, String titulo, String corpo, Map<String, Object> dados) {
        try {
            var resp = userServiceClient.buscarPushToken(participanteId);
            if (resp == null || resp.getDados() == null) return;
            String pushToken = resp.getDados().get("pushToken");
            enviar(pushToken, titulo, corpo, dados);
        } catch (FeignException e) {
            log.warn("Falha ao buscar push token do participante {}: {}", participanteId, e.getMessage());
        }
    }

    private void enviar(String pushToken, String titulo, String corpo, Map<String, Object> dados) {
        if (pushToken == null || pushToken.isBlank()) return;

        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("to", pushToken);
            payload.put("title", titulo);
            payload.put("body", corpo);
            payload.put("sound", "default");
            if (dados != null) payload.put("data", dados);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("Accept", "application/json");
            headers.set("Accept-Encoding", "gzip, deflate");

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);
            restTemplate.postForEntity(EXPO_PUSH_URL, request, String.class);

            log.debug("Push enviado para {}: {}", pushToken, titulo);
        } catch (Exception e) {
            log.warn("Falha ao enviar push notification para {}: {}", pushToken, e.getMessage());
        }
    }
}
