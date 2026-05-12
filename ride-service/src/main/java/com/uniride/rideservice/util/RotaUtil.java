package com.uniride.rideservice.util;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;

public class RotaUtil {

    /**
     * Gera link do Google Maps com origem, destino e waypoints (pontos de embarque dos passageiros).
     * O motorista abre esse link e o Google Maps calcula a melhor rota passando por todos.
     */
    public static String gerarLinkGoogleMaps(double latOrigem, double lngOrigem,
                                              double latDestino, double lngDestino,
                                              List<double[]> waypoints) {
        StringBuilder sb = new StringBuilder();
        sb.append("https://www.google.com/maps/dir/?api=1");
        sb.append("&origin=").append(latOrigem).append(",").append(lngOrigem);
        sb.append("&destination=").append(latDestino).append(",").append(lngDestino);

        if (waypoints != null && !waypoints.isEmpty()) {
            sb.append("&waypoints=");
            for (int i = 0; i < waypoints.size(); i++) {
                if (i > 0) sb.append("|");
                sb.append(waypoints.get(i)[0]).append(",").append(waypoints.get(i)[1]);
            }
        }

        sb.append("&travelmode=driving");
        return sb.toString();
    }

    /**
     * Gera link do Google Maps usando strings de endereço (mais preciso que coordenadas).
     * O Google Maps usa seu próprio geocoding para resolver os endereços.
     */
    public static String gerarLinkGoogleMapsComEnderecos(String origem, String destino,
                                                          List<String> waypoints) {
        StringBuilder sb = new StringBuilder();
        sb.append("https://www.google.com/maps/dir/?api=1");
        sb.append("&origin=").append(URLEncoder.encode(origem, StandardCharsets.UTF_8).replace("+", "%20"));
        sb.append("&destination=").append(URLEncoder.encode(destino, StandardCharsets.UTF_8).replace("+", "%20"));

        if (waypoints != null && !waypoints.isEmpty()) {
            sb.append("&waypoints=");
            for (int i = 0; i < waypoints.size(); i++) {
                if (i > 0) sb.append("|");
                sb.append(URLEncoder.encode(waypoints.get(i), StandardCharsets.UTF_8).replace("+", "%20"));
            }
        }

        sb.append("&travelmode=driving");
        return sb.toString();
    }

    /**
     * Gera link do Waze com destino final.
     */
    public static String gerarLinkWaze(double latDestino, double lngDestino) {
        return "https://waze.com/ul?ll=" + latDestino + "," + lngDestino + "&navigate=yes";
    }

    /**
     * Ordena os passageiros aprovados por proximidade ao ponto de origem do motorista
     * para otimizar o percurso de embarque.
     */
    public static List<double[]> otimizarOrdemEmbarque(double latOrigem, double lngOrigem,
                                                        List<double[]> pontos) {
        return pontos.stream()
                .sorted((a, b) -> Double.compare(
                        HaversineUtil.calcular(latOrigem, lngOrigem, a[0], a[1]),
                        HaversineUtil.calcular(latOrigem, lngOrigem, b[0], b[1])
                ))
                .toList();
    }
}
