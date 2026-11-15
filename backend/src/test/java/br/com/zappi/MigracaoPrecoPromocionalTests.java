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
 * Migração do preço promocional (V9, ZAP-159, ZAP-152) sobre um banco com loja, produtos e
 * pedido. Num schema separado, as migrações rodam até a V8, os dados são gravados no formato
 * antigo e a V9 roda por cima. O schema é apagado no fim.
 */
@SpringBootTest
@Import(TestcontainersConfiguration.class)
class MigracaoPrecoPromocionalTests {

	private static final String SCHEMA = "teste_v9";

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
	void migraAteAV8EGravaOsDadosAntigos() {
		apagarSchema();
		migrar("8");

		loja = id("insert into %s.estabelecimento (nome, slug, telefone_whatsapp) values ('Loja A', 'loja-a', "
				+ "'5511900000001') returning id");
		categoria = id("insert into %s.categoria (estabelecimento_id, nome, ordem) values (?, 'Bolos', 1) returning id",
				loja);
		produtoAtivo = id("""
				insert into %s.produto (estabelecimento_id, unidade_medida_id, categoria_id, nome, preco)
				values (?, 1, ?, 'Bolo de ninho com morango', 115.00) returning id
				""", loja, categoria);
		produtoExcluido = id("""
				insert into %s.produto (estabelecimento_id, unidade_medida_id, categoria_id, nome, preco, ativo)
				values (?, 1, ?, 'Bolo de brigadeiro', 100.00, false) returning id
				""", loja, categoria);
		long cliente = id("""
				insert into %s.cliente (estabelecimento_id, nome, telefone_whatsapp, consentimento_lgpd, consentimento_em)
				values (?, 'Cliente de teste', '5511900000002', true, now()) returning id
				""", loja);
		pedido = id("""
				insert into %s.pedido (estabelecimento_id, cliente_id, numero, status, data_retirada, valor_total)
				values (?, ?, 1, 1, current_date + 7 + time '12:00', 172.50) returning id
				""", loja, cliente);
		jdbc.update(sql("""
				insert into %s.item_pedido (pedido_id, produto_id, quantidade, preco_unitario, subtotal)
				values (?, ?, 1.5, 115.00, 172.50)
				"""), pedido, produtoAtivo);

		migrar("latest");
	}

	@AfterEach
	void apagarSchema() {
		jdbc.execute("drop schema if exists " + SCHEMA + " cascade");
	}

	@Test
	void produtosQueJaExistiamFicamSemPromocaoESemPerderDados() {
		Map<String, Object> ativo = produto(produtoAtivo);
		assertThat(ativo).containsEntry("nome", "Bolo de ninho com morango")
			.containsEntry("ativo", true)
			.containsEntry("no_cardapio", true)
			.containsEntry("preco_promocional", null);
		assertThat((BigDecimal) ativo.get("preco")).isEqualByComparingTo("115.00");

		assertThat(produto(produtoExcluido)).containsEntry("ativo", false).containsEntry("preco_promocional", null);
	}

	@Test
	void lojaQueJaExistiaFicaComODestaqueLigado() {
		assertThat(jdbc.queryForObject(sql("select destacar_promocoes from %s.estabelecimento where id = ?"),
				Boolean.class, loja))
			.isTrue();
	}

	@Test
	void pedidoQueJaExistiaNaoMuda() {
		Map<String, Object> item = jdbc.queryForMap(
				sql("select produto_id, preco_unitario, subtotal from %s.item_pedido where pedido_id = ?"), pedido);

		assertThat(item).containsEntry("produto_id", produtoAtivo);
		assertThat((BigDecimal) item.get("preco_unitario")).isEqualByComparingTo("115.00");
		assertThat((BigDecimal) item.get("subtotal")).isEqualByComparingTo("172.50");
	}

	@Test
	void aceitaPrecoComDescontoMenorQueONormalEVoltaASerNulo() {
		jdbc.update(sql("update %s.produto set preco_promocional = 99.90 where id = ?"), produtoAtivo);
		assertThat((BigDecimal) produto(produtoAtivo).get("preco_promocional")).isEqualByComparingTo("99.90");

		// Encerrar a promoção apaga o preço com desconto
		jdbc.update(sql("update %s.produto set preco_promocional = null where id = ?"), produtoAtivo);
		assertThat(produto(produtoAtivo)).containsEntry("preco_promocional", null);
	}

	@Test
	void recusaPrecoComDescontoIgualOuMaiorQueONormal() {
		recusaPromocao("115.00");
		recusaPromocao("120.00");
	}

	@Test
	void recusaPrecoComDescontoZeroOuNegativo() {
		recusaPromocao("0");
		recusaPromocao("-1.00");
	}

	@Test
	void recusaBaixarOPrecoNormalAbaixoDoComDesconto() {
		jdbc.update(sql("update %s.produto set preco_promocional = 99.90 where id = ?"), produtoAtivo);

		assertThatThrownBy(() -> jdbc.update(sql("update %s.produto set preco = 99.90 where id = ?"), produtoAtivo))
			.isInstanceOf(DataIntegrityViolationException.class)
			.hasMessageContaining("ck_produto_preco_promocional");
	}

	@Test
	void recusaDestaqueNulo() {
		assertThatThrownBy(
				() -> jdbc.update(sql("update %s.estabelecimento set destacar_promocoes = null where id = ?"), loja))
			.isInstanceOf(DataIntegrityViolationException.class)
			.hasMessageContaining("destacar_promocoes");
	}

	@Test
	void criaAsColunasComTipoObrigatoriedadeEPadraoEsperados() {
		assertThat(coluna("produto", "preco_promocional")).containsEntry("data_type", "numeric")
			.containsEntry("numeric_precision", 10)
			.containsEntry("numeric_scale", 2)
			.containsEntry("is_nullable", "YES")
			.containsEntry("column_default", null);
		assertThat(coluna("estabelecimento", "destacar_promocoes")).containsEntry("data_type", "boolean")
			.containsEntry("is_nullable", "NO")
			.containsEntry("column_default", "true");
	}

	private void recusaPromocao(String precoPromocional) {
		assertThatThrownBy(() -> jdbc.update(sql("update %s.produto set preco_promocional = ? where id = ?"),
				new BigDecimal(precoPromocional), produtoAtivo))
			.isInstanceOf(DataIntegrityViolationException.class)
			.hasMessageContaining("ck_produto_preco_promocional");
	}

	private Map<String, Object> produto(long id) {
		return jdbc.queryForMap(
				sql("select nome, preco, preco_promocional, ativo, no_cardapio from %s.produto where id = ?"), id);
	}

	private Map<String, Object> coluna(String tabela, String nome) {
		return jdbc.queryForMap("""
				select data_type, numeric_precision, numeric_scale, is_nullable, column_default
				from information_schema.columns
				where table_schema = ? and table_name = ? and column_name = ?
				""", SCHEMA, tabela, nome);
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
