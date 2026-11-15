package br.com.zappi;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
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
 * Migração do produto fora do cardápio (V8, ZAP-153, ZAP-151) sobre um banco com produtos e
 * pedido. Num schema separado, as migrações rodam até a V7, os dados são gravados no formato
 * antigo e a V8 roda por cima. O schema é apagado no fim.
 */
@SpringBootTest
@Import(TestcontainersConfiguration.class)
class MigracaoProdutoForaDoCardapioTests {

	private static final String SCHEMA = "teste_v8";

	@Autowired
	private Flyway flyway;

	@Autowired
	private JdbcTemplate jdbc;

	private long loja;

	private long categoria;

	private long produtoAtivo;

	private long produtoExcluido;

	private long pedido;

	@BeforeEach
	void migraAteAV7EGravaOsDadosAntigos() {
		apagarSchema();
		migrar("7");

		loja = id("insert into %s.estabelecimento (nome, slug, telefone_whatsapp) values ('Loja A', 'loja-a', "
				+ "'5511900000001') returning id");
		categoria = id("insert into %s.categoria (estabelecimento_id, nome, ordem) values (?, 'Bolos', 1) returning id",
				loja);
		produtoAtivo = id("""
				insert into %s.produto (estabelecimento_id, unidade_medida_id, categoria_id, nome, preco)
				values (?, 1, ?, 'Bolo de brigadeiro', 100.00) returning id
				""", loja, categoria);
		produtoExcluido = id("""
				insert into %s.produto (estabelecimento_id, unidade_medida_id, categoria_id, nome, preco, ativo)
				values (?, 1, ?, 'Bolo de ninho', 115.00, false) returning id
				""", loja, categoria);
		long cliente = id("""
				insert into %s.cliente (estabelecimento_id, nome, telefone_whatsapp, consentimento_lgpd, consentimento_em)
				values (?, 'Cliente de teste', '5511900000002', true, now()) returning id
				""", loja);
		pedido = id("""
				insert into %s.pedido (estabelecimento_id, cliente_id, numero, status, data_retirada, valor_total)
				values (?, ?, 1, 1, current_date + 7 + time '12:00', 150.00) returning id
				""", loja, cliente);
		jdbc.update(sql("""
				insert into %s.item_pedido (pedido_id, produto_id, quantidade, preco_unitario, subtotal)
				values (?, ?, 1.5, 100.00, 150.00)
				"""), pedido, produtoAtivo);

		migrar("latest");
	}

	@AfterEach
	void apagarSchema() {
		jdbc.execute("drop schema if exists " + SCHEMA + " cascade");
	}

	@Test
	void produtosQueJaExistiamFicamNoCardapioSemPerderDados() {
		Map<String, Object> ativo = produto(produtoAtivo);
		assertThat(ativo).containsEntry("nome", "Bolo de brigadeiro")
			.containsEntry("ativo", true)
			.containsEntry("no_cardapio", true);
		assertThat((BigDecimal) ativo.get("preco")).isEqualByComparingTo("100.00");

		// O excluído continua excluído (RN14): a coluna nova não o traz de volta
		assertThat(produto(produtoExcluido)).containsEntry("ativo", false).containsEntry("no_cardapio", true);
	}

	@Test
	void pedidoQueJaExistiaNaoMuda() {
		Map<String, Object> item = jdbc.queryForMap(
				sql("select produto_id, preco_unitario, subtotal from %s.item_pedido where pedido_id = ?"), pedido);

		assertThat(item).containsEntry("produto_id", produtoAtivo);
		assertThat((BigDecimal) item.get("preco_unitario")).isEqualByComparingTo("100.00");
		assertThat((BigDecimal) item.get("subtotal")).isEqualByComparingTo("150.00");
	}

	@Test
	void produtoNovoEntraNoCardapioPorPadrao() {
		long novo = id("""
				insert into %s.produto (estabelecimento_id, unidade_medida_id, categoria_id, nome, preco)
				values (?, 2, ?, 'Coxinha', 1.25) returning id
				""", loja, categoria);

		assertThat(produto(novo)).containsEntry("no_cardapio", true);
	}

	@Test
	void produtoPodeSairEVoltarAoCardapio() {
		jdbc.update(sql("update %s.produto set no_cardapio = false where id = ?"), produtoAtivo);
		assertThat(produto(produtoAtivo)).containsEntry("ativo", true).containsEntry("no_cardapio", false);

		jdbc.update(sql("update %s.produto set no_cardapio = true where id = ?"), produtoAtivo);
		assertThat(produto(produtoAtivo)).containsEntry("no_cardapio", true);
	}

	@Test
	void recusaEstadoNulo() {
		assertThatThrownBy(
				() -> jdbc.update(sql("update %s.produto set no_cardapio = null where id = ?"), produtoAtivo))
			.isInstanceOf(DataIntegrityViolationException.class)
			.hasMessageContaining("no_cardapio");
	}

	@Test
	void criaAColunaComTipoObrigatoriedadeEPadraoEsperados() {
		Map<String, Object> coluna = jdbc.queryForMap("""
				select data_type, is_nullable, column_default
				from information_schema.columns
				where table_schema = ? and table_name = 'produto' and column_name = 'no_cardapio'
				""", SCHEMA);

		assertThat(coluna).containsEntry("data_type", "boolean")
			.containsEntry("is_nullable", "NO")
			.containsEntry("column_default", "true");
	}

	private Map<String, Object> produto(long id) {
		return jdbc.queryForMap(sql("select nome, preco, ativo, no_cardapio from %s.produto where id = ?"), id);
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
