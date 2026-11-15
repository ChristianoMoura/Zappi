package br.com.zappi;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import java.util.Map;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * Migração do aceite dos termos (V7, ZAP-145) sobre um banco com usuário, cliente e pedido. Num
 * schema separado, as migrações rodam até a V6, os dados são gravados no formato antigo e a V7 roda
 * por cima. O schema é apagado no fim.
 */
@SpringBootTest
@Import(TestcontainersConfiguration.class)
class MigracaoAceiteTermosTests {

	private static final String SCHEMA = "teste_v7";

	@Autowired
	private Flyway flyway;

	@Autowired
	private JdbcTemplate jdbc;

	private long loja;

	private long usuario;

	private long clienteAntigo;

	@BeforeEach
	void migraAteAV6EGravaOsDadosAntigos() {
		apagarSchema();
		migrar("6");

		loja = id("insert into %s.estabelecimento (nome, slug, telefone_whatsapp) values ('Loja A', 'loja-a', "
				+ "'5511900000001') returning id");
		usuario = id("""
				insert into %s.usuario (estabelecimento_id, nome, email, senha_hash)
				values (?, 'Usuária de teste', 'teste@zappi.com.br', 'hash') returning id
				""", loja);
		clienteAntigo = id("""
				insert into %s.cliente (estabelecimento_id, nome, telefone_whatsapp, consentimento_lgpd, consentimento_em)
				values (?, 'Cliente antigo', '5511900000002', true, now() - interval '30 days') returning id
				""", loja);
		jdbc.update(sql("""
				insert into %s.pedido (estabelecimento_id, cliente_id, numero, status, data_retirada, valor_total)
				values (?, ?, 1, 1, current_date + 7 + time '12:00', 100.00)
				"""), loja, clienteAntigo);

		migrar("latest");
	}

	@AfterEach
	void apagarSchema() {
		jdbc.execute("drop schema if exists " + SCHEMA + " cascade");
	}

	@Test
	void clienteAntigoFicaIntactoESemVersaoDoConsentimento() {
		Map<String, Object> cliente = jdbc.queryForMap(sql("""
				select nome, telefone_whatsapp, consentimento_lgpd, consentimento_versao from %s.cliente where id = ?
				"""), clienteAntigo);

		assertThat(cliente).containsEntry("nome", "Cliente antigo")
			.containsEntry("telefone_whatsapp", "5511900000002")
			.containsEntry("consentimento_lgpd", true)
			.containsEntry("consentimento_versao", null);
		assertThat(jdbc.queryForObject(sql("select count(*) from %s.pedido where cliente_id = ?"), Integer.class,
				clienteAntigo))
			.isEqualTo(1);
	}

	@Test
	void clienteNovoGuardaAVersaoAceita() {
		jdbc.update(sql("""
				insert into %s.cliente (estabelecimento_id, nome, telefone_whatsapp, consentimento_lgpd, consentimento_em,
				                        consentimento_versao)
				values (?, 'Cliente novo', '5511900000003', true, now(), 1)
				"""), loja);

		assertThat(jdbc.queryForObject(sql("select consentimento_versao from %s.cliente where nome = 'Cliente novo'"),
				Integer.class))
			.isEqualTo(1);
	}

	@Test
	void recusaVersaoDoConsentimentoZeroOuNegativa() {
		assertThatThrownBy(() -> jdbc.update(sql("update %s.cliente set consentimento_versao = 0 where id = ?"),
				clienteAntigo))
			.isInstanceOf(DataIntegrityViolationException.class)
			.hasMessageContaining("ck_cliente_consentimento_versao");
	}

	@Test
	void criaATabelaDeAceitesComOsCamposEsperados() {
		List<Map<String, Object>> colunas = jdbc.queryForList("""
				select column_name, data_type, character_maximum_length, is_nullable
				from information_schema.columns
				where table_schema = ? and table_name = 'aceite_termos'
				order by ordinal_position
				""", SCHEMA);

		assertThat(colunas).extracting(coluna -> coluna.get("column_name"))
			.containsExactly("id", "usuario_id", "versao", "aceito_em", "ip_origem", "user_agent");
		assertThat(colunas).extracting(coluna -> coluna.get("data_type"))
			.containsExactly("bigint", "bigint", "integer", "timestamp with time zone", "character varying",
					"character varying");
		assertThat(colunas).extracting(coluna -> coluna.get("character_maximum_length"))
			.containsExactly(null, null, null, null, 45, 255);
		assertThat(colunas).extracting(coluna -> coluna.get("is_nullable"))
			.containsExactly("NO", "NO", "NO", "NO", "YES", "YES");
	}

	@Test
	void guardaCadaAceiteComoUmRegistroNovo() {
		aceite(usuario, 1, "203.0.113.7", "Navegador de teste");
		aceite(usuario, 1, "203.0.113.8", "Outro navegador");
		aceite(usuario, 2, null, null);

		assertThat(jdbc.queryForList(sql("select versao from %s.aceite_termos where usuario_id = ? order by id"),
				Integer.class, usuario))
			.containsExactly(1, 1, 2);
		Map<String, Object> primeiro = jdbc.queryForMap(
				sql("select ip_origem, user_agent, aceito_em from %s.aceite_termos where usuario_id = ? order by id limit 1"),
				usuario);
		assertThat(primeiro).containsEntry("ip_origem", "203.0.113.7").containsEntry("user_agent", "Navegador de teste");
		assertThat(primeiro.get("aceito_em")).isNotNull();
	}

	@Test
	void recusaAceiteDeUsuarioInexistenteOuComVersaoInvalida() {
		assertThatThrownBy(() -> aceite(-1, 1, null, null)).isInstanceOf(DataIntegrityViolationException.class)
			.hasMessageContaining("fk_aceite_termos_usuario");
		assertThatThrownBy(() -> aceite(usuario, 0, null, null)).isInstanceOf(DataIntegrityViolationException.class)
			.hasMessageContaining("ck_aceite_termos_versao");
	}

	@Test
	void ligaORlsNaTabelaDeAceites() {
		assertThat(jdbc.queryForObject("""
				select c.relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace
				where n.nspname = ? and c.relname = 'aceite_termos'
				""", Boolean.class, SCHEMA)).isTrue();
	}

	private void aceite(long usuarioId, int versao, String ip, String navegador) {
		jdbc.update(sql("insert into %s.aceite_termos (usuario_id, versao, ip_origem, user_agent) values (?, ?, ?, ?)"),
				usuarioId, versao, ip, navegador);
	}

	private void migrar(String versao) {
		Flyway.configure()
			.configuration(flyway.getConfiguration())
			.schemas(SCHEMA)
			.defaultSchema(SCHEMA)
			.createSchemas(true)
			.target(versao)
			.load()
			.migrate();
	}

	private long id(String comando, Object... parametros) {
		return jdbc.queryForObject(sql(comando), Long.class, parametros);
	}

	private static String sql(String comando) {
		return comando.formatted(SCHEMA);
	}

}
