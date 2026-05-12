package com.uniride.rideservice.util;

public class HaversineUtil {

    private static final double RAIO_TERRA_KM = 6371.0;

    public static double calcular(double lat1, double lng1, double lat2, double lng2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        return RAIO_TERRA_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    public static boolean dentroDoRaio(double latRef, double lngRef,
                                        double latAlvo, double lngAlvo, double raioKm) {
        return calcular(latRef, lngRef, latAlvo, lngAlvo) <= raioKm;
    }
}
