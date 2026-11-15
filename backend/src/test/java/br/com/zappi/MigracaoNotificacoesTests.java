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
 * Migração das notificações (V10, ZAP-173, ZAP-172) sobre um banco com loja, cliente e pedido.
 * Num schema separado, as migrações rodam até a V9, os dados são gravados no formato antigo e a
 * V10 roda por cima. O schema é apagado no fim.
 */
@SpringBootTest
@Import(TestcontainersConfiguration.class)
class MigracaoNotificacoesTests {

	private static final String SCHEMA = "teste_v10";

	@Autowired
	private Flyway flyway;

	@Autowired
	private JdbcTemplate jdbc;

	private long loja;

	private long pedido;

	@BeforeEach
	void migraAteAV9EGravaOsDadosAntigos() {
		apagarSchema();
		migrar("9");

		loja = id("insert into %s.estabelecimento (nome, slug, telefone_whatsapp) values ('Loja A', 'loja-a', "
				+ "'5511900000001') returning id");
		long cliente = id("""
				insert into %s.cliente (estabelecimento_id, nome, telefone_whatsapp, consentimento_lgpd, consentimento_em)
				values (?, 'Cliente de teste', '5511900000002', true, now()) returning id
				""", loja);
		pedido = id("""
				insert into %s.pedido (estabelecimento_id, cliente_id, numero, status, data_retirada, valor_total)
				values (?, ?, 1, 1, current_date + 7 + time '12:00', 100.00) returning id
				""", loja, cliente);

		migrar("latest");
	}

	@AfterEach
	void apagarSchema() {
		jdbc.execute("drop schema if exists " + SCHEMA + " cascade");
	}

	@Test
	void comecaVaziaESemMexerNoPedidoQueJaExistia() {
		assertThat(jdbc.queryForObject(sql("select count(*) from %s.notificacao"), Integer.class)).isZero();
		assertThat(jdbc.queryForObject(sql("select numero from %s.pedido where id = ?"), Integer.class, pedido))
			.isEqualTo(1);
	}

	@Test
	void gravaONovoPedidoSemMomentoENaoVista() {
		long id = id("insert into %s.notificacao (estabelecimento_id, pedido_id, tipo) values (?, ?, 1) returning id",
				loja, pedido);

		Map<String, Object> notificacao = jdbc
			.queryForMap(sql("select tipo, momento, criado_em, vista_em from %s.notificacao where id = ?"), id);
		assertThat(((Number) notificacao.get("tipo")).intValue()).isEqualTo(1);
		assertThat(notificacao)
			.containsEntry("momento", null)
			.containsEntry("vista_em", null);
		assertThat(notificacao.get("criado_em")).isNotNull();
	}

	@Test
	void gravaOsTresMomentosDaRetiradaProxima() {
		for (String momento : List.of("VESPERA", "NO_DIA", "DUAS_HORAS")) {
			retiradaProxima(momento);
		}

		assertThat(jdbc.queryForObject(sql("select count(*) from %s.notificacao where tipo = 2"), Integer.class))
			.isEqualTo(3);
	}

	@Test
	void recusaONovoPedidoRepetido() {
		jdbc.update(sql("insert into %s.notificacao (estabelecimento_id, pedido_id, tipo) values (?, ?, 1)"), loja,
				pedido);

		// O momento nulo conta como igual (NULLS NOT DISTINCT)
		assertThatThrownBy(() -> jdbc.update(
				sql("insert into %s.notificacao (estabelecimento_id, pedido_id, tipo) values (?, ?, 1)"), loja, pedido))
			.isInstanceOf(DataIntegrityViolationException.class)
			.hasMessageContaining("uk_notificacao_pedido_tipo_momento");
	}

	@Test
	void recusaAMesmaRetiradaProximaRepetida() {
		retiradaProxima("NO_DIA");

		assertThatThrownBy(() -> retiradaProxima("NO_DIA")).isInstanceOf(DataIntegrityViolationException.class)
			.hasMessageContaining("uk_notificacao_pedido_tipo_momento");
	}

	@Test
	void recusaTipoForaDaLista() {
		assertThatThrownBy(() -> jdbc.update(
				sql("insert into %s.notificacao (estabelecimento_id, pedido_id, tipo) values (?, ?, 3)"), loja, pedido))
			.isInstanceOf(DataIntegrityViolationException.class)
			.hasMessageContaining("ck_notificacao_tipo");
	}

	@Test
	void recusaMomentoQueNaoCombinaComOTipo() {
		// Novo pedido com momento
		recusaMomento(1, "NO_DIA");
		// Retirada próxima sem momento ou com momento desconhecido
		recusaMomento(2, null);
		recusaMomento(2, "AMANHA");
	}

	@Test
	void recusaPedidoInexistente() {
		assertThatThrownBy(() -> jdbc.update(
				sql("insert into %s.notificacao (estabelecimento_id, pedido_id, tipo) values (?, ?, 1)"), loja, 999_999L))
			.isInstanceOf(DataIntegrityViolationException.class)
			.hasMessageContaining("fk_notificacao_pedido");
	}

	@Test
	void naoGuardaTextoNemDadoPessoal() {
		List<String> colunas = jdbc.queryForList("""
				select column_name from information_schema.columns
				where table_schema = ? and table_name = 'notificacao' order by ordinal_position
				""", String.class, SCHEMA);

		assertThat(colunas).containsExactly("id", "estabelecimento_id", "pedido_id", "tipo", "momento", "criado_em",
				"vista_em");
	}

	@Test
	void ligaORlsECriaOIndiceDaLoja() {
		assertThat(jdbc.queryForObject("""
				select c.relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace
				where n.nspname = ? and c.relname = 'notificacao'
				""", Boolean.class, SCHEMA)).isTrue();
		assertThat(jdbc.queryForObject("""
				select indexdef from pg_indexes where schemaname = ? and indexname = 'idx_notificacao_estabelecimento'
				""", String.class, SCHEMA)).contains("(estabelecimento_id, vista_em, criado_em)");
	}

	private void retiradaProxima(String momento) {
		jdbc.update(
				sql("insert into %s.notificacao (estabelecimento_id, pedido_id, tipo, momento) values (?, ?, 2, ?)"),
				loja, pedido, momento);
	}

	private void recusaMomento(int tipo, String momento) {
		assertThatThrownBy(() -> jdbc.update(
				sql("insert into %s.notificacao (estabelecimento_id, pedido_id, tipo, momento) values (?, ?, ?, ?)"),
				loja, pedido, tipo, momento))
			.isInstanceOf(DataIntegrityViolationException.class)
			.hasMessageContaining("ck_notificacao_momento");
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
