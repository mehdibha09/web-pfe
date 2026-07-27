package com.cloud_pricer;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class CloudPricerApplication {

	public static void main(String[] args) {
		SpringApplication.run(CloudPricerApplication.class, args);
	}

}
