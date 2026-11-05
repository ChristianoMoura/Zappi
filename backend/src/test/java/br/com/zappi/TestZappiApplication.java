package br.com.zappi;

import org.springframework.boot.SpringApplication;

public class TestZappiApplication {

	public static void main(String[] args) {
		SpringApplication.from(ZappiApplication::main).with(TestcontainersConfiguration.class).run(args);
	}

}
