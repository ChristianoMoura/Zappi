package br.com.zappi;

import java.util.UUID;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Bean;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistrar;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

@TestConfiguration(proxyBeanMethods = false)
public class TestcontainersConfiguration {

	@Bean
	@ServiceConnection
	PostgreSQLContainer postgresContainer() {
		return new PostgreSQLContainer(DockerImageName.parse("postgres:17-alpine"));
	}

	/**
	 * Nos testes, a V2 grava para a Lídia o hash de uma senha aleatória, gerada a cada
	 * execução. Assim nenhum hash fica no repositório.
	 */
	@Bean
	DynamicPropertyRegistrar senhaDaLidiaNosTestes() {
		String hash = new BCryptPasswordEncoder(12).encode(UUID.randomUUID().toString());
		return registro -> registro.add("LIDIA_SENHA_HASH", () -> hash);
	}

}
