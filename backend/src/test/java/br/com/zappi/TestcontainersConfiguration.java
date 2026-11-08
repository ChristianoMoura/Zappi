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

	/**
	 * Senha da Lídia nos testes: aleatória, gerada a cada execução. A V2 grava o hash dela,
	 * então nenhuma senha nem hash fica no repositório.
	 */
	public static final String SENHA_DA_LIDIA = "Teste@" + UUID.randomUUID();

	@Bean
	@ServiceConnection
	PostgreSQLContainer postgresContainer() {
		return new PostgreSQLContainer(DockerImageName.parse("postgres:17-alpine"));
	}

	@Bean
	DynamicPropertyRegistrar senhaDaLidiaNosTestes() {
		String hash = new BCryptPasswordEncoder(12).encode(SENHA_DA_LIDIA);
		return registro -> registro.add("LIDIA_SENHA_HASH", () -> hash);
	}

}
