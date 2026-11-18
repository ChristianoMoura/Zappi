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
 * Migração do nome do cliente em cada pedido (V14, ZAP-200, ZAP-199) sobre um banco com pedidos
 * de um cliente comum e de um cliente já anonimizado. Num schema separado, as migrações rodam até
 * a V13, os pedidos são gravados e a V14 roda por cima. O schema é apagado no fim.
 */
@SpringBootTest
@Import(TestcontainersConfiguration.class)
class MigracaoNomeDoClienteNoPedidoTests {

	private static final String SCHEMA = "teste_v14";

	@Autowired
	private Flyway flyway;

	@Autowired
	private JdbcTemplate jdbc;

	private long loja;

	private long ana;

	private long anonimizado;

	@BeforeEach
	void migraAteAV13EGravaOsPedidosAntigos() {
		apagarSchema();
		migrar("13");

		loja = id("insert into %s.estabelecimento (nome, slug, telefone_whatsapp) values ('Loja A', 'loja-a', "
				+ "'5511900000001') returning id");
		ana = cliente("Ana Exemplo", "5511900000002");
		// Cliente anonimizado antes da V14 (RN17): o nome já é "Cliente anonimizado"
		anonimizado = cliente("Bruno Exemplo", "5511900000003");
		jdbc.update(sql("update %s.cliente set nome = 'Cliente anonimizado', telefone_whatsapp = ?, "
				+ "anonimizado_em = now() where id = ?"), "0%012d".formatted(anonimizado), anonimizado);

		pedido(ana, 1, 1);
		pedido(ana, 2, 4);
		pedido(anonimizado, 3, 4);

		migrar("latest");
	}

	@AfterEach
	void apagarSchema() {
		jdbc.execute("drop schema if exists " + SCHEMA + " cascade");
	}

	@Test
	void osPedidosAntigosFicamComONomeDoCliente() {
		assertThat(nomesDosPedidos(ana)).containsExactly("Ana Exemplo", "Ana Exemplo");
	}

	@Test
	void osPedidosDoClienteAnonimizadoFicamSemONome() {
		assertThat(nomesDosPedidos(anonimizado)).containsExactly("Cliente anonimizado");
	}

	@Test
	void osPedidosDeExemploDaV2TambemRecebemONome() {
		assertThat(jdbc.queryForObject(sql("select count(*) from %s.pedido where nome_cliente is null"),
				Integer.class))
			.isZero();
	}

	@Test
	void oClienteContinuaComONome() {
		assertThat(jdbc.queryForObject(sql("select nome from %s.cliente where id = ?"), String.class, ana))
			.isEqualTo("Ana Exemplo");
	}

	@Test
	void recusaPedidoSemONome() {
		assertThatThrownBy(() -> id("""
				insert into %s.pedido (estabelecimento_id, cliente_id, numero, status, data_retirada, valor_total)
				values (?, ?, 9, 1, current_date + 7 + time '12:00', 100.00) returning id
				""", loja, ana))
			.isInstanceOf(DataIntegrityViolationException.class)
			.hasMessageContaining("nome_cliente");
	}

	@Test
	void aceitaPedidoDoMesmoClienteComOutroNome() {
		jdbc.update(sql("""
				insert into %s.pedido (estabelecimento_id, cliente_id, numero, status, data_retirada, valor_total,
				                       nome_cliente)
				values (?, ?, 9, 1, current_date + 7 + time '12:00', 100.00, 'Ana Prima')
				"""), loja, ana);

		assertThat(nomesDosPedidos(ana)).containsExactly("Ana Exemplo", "Ana Exemplo", "Ana Prima");
	}

	@Test
	void criaAColunaObrigatoria() {
		Map<String, Object> coluna = jdbc.queryForMap("""
				select data_type, character_maximum_length, is_nullable from information_schema.columns
				where table_schema = ? and table_name = 'pedido' and column_name = 'nome_cliente'
				""", SCHEMA);

		assertThat(coluna).containsEntry("data_type", "character varying")
			.containsEntry("character_maximum_length", 100)
			.containsEntry("is_nullable", "NO");
	}

	private List<String> nomesDosPedidos(long cliente) {
		return jdbc.queryForList(sql("select nome_cliente from %s.pedido where cliente_id = ? order by numero"),
				String.class, cliente);
	}

	private long cliente(String nome, String telefone) {
		return id("""
				insert into %s.cliente (estabelecimento_id, nome, telefone_whatsapp, consentimento_lgpd, consentimento_em)
				values (?, ?, ?, true, now()) returning id
				""", loja, nome, telefone);
	}

	private void pedido(long cliente, int numero, int status) {
		id("""
				insert into %s.pedido (estabelecimento_id, cliente_id, numero, status, data_retirada, valor_total)
				values (?, ?, ?, ?, current_date + 7 + time '12:00', 100.00) returning id
				""", loja, cliente, numero, status);
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
