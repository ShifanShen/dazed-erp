package com.example.dazederp;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class DazedErpApplication {

    public static void main(String[] args) {
        SpringApplication.run(DazedErpApplication.class, args);
    }

}
