package br.com.zappi;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.HashMap;
import java.util.Map;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * Conversão do {@code contem_gluten} da V5 para a lista {@code alergenos} da V12 (ZAP-197). As
 * migrações rodam até a V11 num esquema separado, com a mesma configuração do Flyway da
 * aplicação; os produtos são marcados como na V5 e a V12 roda por cima. O esquema é apagado no
 * fim.
 */
@SpringBootTest
@Import(TestcontainersConfiguration.class)
class MigracaoDosAlergenosTests {

	private static final String ESQUEMA = "zap197_migracao";

	@Autowired
	private Flyway flywayDaAplicacao;

	@Autowired
	private JdbcTemplate jdbc;

	@AfterEach
	void apagaOEsquema() {
		jdbc.execute("drop schema if exists " + ESQUEMA + " cascade");
	}

	@Test
	void produtoComGlutenPassaATerOCodigoGlutenEOContemGlutenSai() {
		migrarAte("11");
		jdbc.update("update " + ESQUEMA + ".produto set contem_gluten = true, outros_alergenos = 'leite' "
				+ "where nome = 'Bolo de brigadeiro de chocolate'");
		jdbc.update("update " + ESQUEMA + ".produto set contem_gluten = false where nome = 'Bolo de ninho com morango'");

		migrarAte("12");

		Map<String, String> alergenos = new HashMap<>();
		jdbc.query("select nome, array_to_string(alergenos, ',') as alergenos from " + ESQUEMA + ".produto",
				linha -> {
					alergenos.put(linha.getString("nome"), linha.getString("alergenos"));
				});
		assertThat(alergenos).containsEntry("Bolo de brigadeiro de chocolate", "GLUTEN")
			.containsEntry("Bolo de ninho com morango", "")
			.containsEntry("Cento de coxinha", "");
		assertThat(jdbc.queryForObject("select outros_alergenos from " + ESQUEMA + ".produto "
				+ "where nome = 'Bolo de brigadeiro de chocolate'", String.class)).isEqualTo("leite");
		assertThat(jdbc.queryForObject("""
				select count(*) from information_schema.columns
				where table_schema = ? and table_name = 'produto' and column_name = 'contem_gluten'
				""", Integer.class, ESQUEMA)).isZero();
	}

	private void migrarAte(String versao) {
		Flyway.configure()
			.configuration(flywayDaAplicacao.getConfiguration())
			.schemas(ESQUEMA)
			.defaultSchema(ESQUEMA)
			.createSchemas(true)
			.target(versao)
			.load()
			.migrate();
	}

}
