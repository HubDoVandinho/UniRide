package com.uniride.rideservice.dto.response;

import lombok.*;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RotaResponse {
    private String linkGoogleMaps;
    private String linkWaze;
    private List<WaypointResponse> waypoints;
    private Double distanciaTotalKm;

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class WaypointResponse {
        private Long passageiroId;
        private String endereco;
        private Double lat;
        private Double lng;
        private Double distanciaOrigemKm;
    }
}
