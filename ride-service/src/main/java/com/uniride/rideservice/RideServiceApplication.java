package com.uniride.rideservice;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.openfeign.EnableFeignClients;




@SpringBootApplication
@EnableFeignClients
@org.springframework.scheduling.annotation.EnableScheduling
public class RideServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(RideServiceApplication.class, args);
    }
}
