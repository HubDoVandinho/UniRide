package com.uniride.userservice.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

@Service
@Slf4j
public class NotificationService {

    private static final String EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

    private final RestTemplate restTemplate = new RestTemplate();

    /**
     * Envia uma notificação push via Expo Push API.
     * Falhas são silenciosas — nunca interrompem o fluxo principal.
     *
     * @param pushToken token do dispositivo (ExponentPushToken[...])
     * @param titulo    título da notificação
     * @param corpo     corpo da notificação
     * @param dados     dados extras para navegação (pode ser null)
     */
    public void enviar(String pushToken, String titulo, String corpo, Map<String, Object> dados) {
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
