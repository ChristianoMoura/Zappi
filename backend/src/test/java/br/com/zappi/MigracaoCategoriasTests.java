package br.com.zappi;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Map;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * Migração das categorias, do nome único e da retirada de recheio e cobertura (V6, ZAP-137) sobre
 * um banco com produtos e pedidos. Num schema separado, as migrações rodam até a V5, os dados são
 * gravados no formato antigo e a V6 roda por cima. O schema é apagado no fim.
 */
@SpringBootTest
@Import(TestcontainersConfiguration.class)
class MigracaoCategoriasTests {

	private static final String SCHEMA = "teste_v6";

	private static final String RECHEIO_MAXIMO = "r".repeat(100);

	private static final String COBERTURA_MAXIMA = "c".repeat(100);

	private static final String OBSERVACAO_MAXIMA = "o".repeat(300);

	private static final String NOME_LONGO = "A" + "a".repeat(99);

	@Autowired
	private Flyway flyway;

	@Autowired
	private JdbcTemplate jdbc;

	private long lojaA;

	private long lojaB;

	private long lojaC;

	@BeforeEach
	void migraAteAV5EGravaOsDadosAntigos() {
		apagarSchema();
		migrar("5");

		lojaA = id("insert into %s.estabelecimento (nome, slug, telefone_whatsapp) values ('Loja A', 'loja-a', "
				+ "'5511900000001') returning id");
		lojaB = id("insert into %s.estabelecimento (nome, slug, telefone_whatsapp) values ('Loja B', 'loja-b', "
				+ "'5511900000002') returning id");

		long brigadeiro = produto(lojaA, "Bolo", "Brigadeiro de chocolate", true);
		produto(lojaA, "bolo", "Cenoura", false);
		produto(lojaA, "Salgado", "Coxinha", true);
		produto(lojaA, "Pão de mel", "Tradicional", true);
		produto(lojaA, "Torta", "Limão", false);
		produto(lojaA, "Café", "Expresso", true);
		produto(lojaA, NOME_LONGO, "Longo", true);
		produto(lojaB, "Bolo", "Ninho", true);

		// Casos da regra de plural() que a Loja A não cobre (ZAP-141)
		lojaC = id("insert into %s.estabelecimento (nome, slug, telefone_whatsapp) values ('Loja C', 'loja-c', "
				+ "'5511900000004') returning id");
		produto(lojaC, "Pão", "Francês", true);
		produto(lojaC, "Mamão", "Papaia", true);
		produto(lojaC, "Pastel", "Carne", true);
		produto(lojaC, " Torta ", "Holandesa", true);
		produto(lojaC, "", "Brownie", true);
		produto(lojaC, "   ", "Cookie", false);

		long cliente = id("""
				insert into %s.cliente (estabelecimento_id, nome, telefone_whatsapp, consentimento_lgpd, consentimento_em)
				values (?, 'Cliente de teste', '5511900000003', true, now()) returning id
				""", lojaA);
		long pedido = id("""
				insert into %s.pedido (estabelecimento_id, cliente_id, numero, status, data_retirada, valor_total)
				values (?, ?, 1, 1, current_date + 7 + time '12:00', 500.00) returning id
				""", lojaA, cliente);
		item(pedido, brigadeiro, "Brigadeiro", "Ganache", "Escrever Parabéns");
		item(pedido, brigadeiro, null, " Granulado. ", null);
		item(pedido, brigadeiro, "   ", null, "Sem açúcar");
		item(pedido, brigadeiro, null, null, null);
		item(pedido, brigadeiro, RECHEIO_MAXIMO, COBERTURA_MAXIMA, OBSERVACAO_MAXIMA);

		migrar("latest");
	}

	@AfterEach
	void apagarSchema() {
		jdbc.execute("drop schema if exists " + SCHEMA + " cascade");
	}

	@Test
	void criaUmaCategoriaPorNomeDeProdutoEmOrdemAlfabetica() {
		// "Bolo" e "bolo" ficam numa categoria só; o produto excluído também ganha a sua
		assertThat(jdbc.queryForList(sql("""
				select lower(nome) || ':' || ordem || ':' || ativo from %s.categoria
				where estabelecimento_id = ? order by ordem
				"""), String.class, lojaA)).containsExactly("a" + "a".repeat(59) + ":1:true", "bolos:2:true",
						"café:3:true", "pão de mel:4:true", "salgados:5:true", "tortas:6:true");
		assertThat(jdbc.queryForList(sql("select nome || ':' || ordem from %s.categoria where estabelecimento_id = ?"),
				String.class, lojaB)).containsExactly("Bolos:1");
	}

	@Test
	void pluralSegueARegraDoCardapioENomeVazioViraOutros() {
		// "ão" e consoante no fim ficam como estão; os espaços das pontas saem; nome vazio ou só com
		// espaços vai para "Outros", inclusive o produto excluído
		// A ordem entre "Pão" e "Pastel" depende da collation do banco, então só os nomes são conferidos
		assertThat(jdbc.queryForList(sql("select nome from %s.categoria where estabelecimento_id = ?"), String.class,
				lojaC)).containsExactlyInAnyOrder("Mamão", "Outros", "Pão", "Pastel", "Tortas");
		assertThat(jdbc.queryForList(sql("""
				select p.nome || ' > ' || c.nome from %1$s.produto p join %1$s.categoria c on c.id = p.categoria_id
				where p.estabelecimento_id = ? order by p.id
				"""), String.class, lojaC)).containsExactly("Francês > Pão", "Papaia > Mamão", "Carne > Pastel",
						"Holandesa > Tortas", "Brownie > Outros", "Cookie > Outros");
	}

	@Test
	void ligaCadaProdutoASuaCategoriaComONomeCompleto() {
		assertThat(jdbc.queryForList(sql("""
				select p.nome || ' > ' || lower(c.nome) from %1$s.produto p join %1$s.categoria c on c.id = p.categoria_id
				where p.estabelecimento_id = ? order by p.id
				"""), String.class, lojaA)).containsExactly("Bolo de brigadeiro de chocolate > bolos", "Cenoura > bolos",
						"Coxinha > salgados", "Tradicional > pão de mel", "Limão > tortas", "Expresso > café",
						"Longo > " + NOME_LONGO.toLowerCase().substring(0, 60));
		assertThat(jdbc.queryForObject(sql("""
				select count(*) from %1$s.produto p join %1$s.categoria c on c.id = p.categoria_id
				where c.estabelecimento_id <> p.estabelecimento_id
				"""), Integer.class)).isZero();
		assertThat(jdbc.queryForList(sql("select nome from %s.produto where estabelecimento_id = ?"), String.class,
				lojaB)).containsExactly("Bolo de ninho");
	}

	@Test
	void copiaORecheioEACoberturaParaOComecoDaObservacao() {
		// Só os itens da Loja A: a V2 também grava os pedidos da Casa Belt neste schema
		List<String> observacoes = jdbc.queryForList(sql("""
				select i.observacao from %1$s.item_pedido i join %1$s.pedido p on p.id = i.pedido_id
				where p.estabelecimento_id = ? order by i.id
				"""), String.class, lojaA);

		assertThat(observacoes).containsExactly("Recheio: Brigadeiro. Cobertura: Ganache. Escrever Parabéns",
				"Cobertura: Granulado.", "Sem açúcar", null,
				"Recheio: " + RECHEIO_MAXIMO + ". Cobertura: " + COBERTURA_MAXIMA + ". " + OBSERVACAO_MAXIMA);
		assertThat(observacoes.get(4)).hasSize(524);
	}

	@Test
	void apagaSaborRecheioECobertura() {
		List<Map<String, Object>> colunas = jdbc.queryForList("""
				select table_name, column_name from information_schema.columns
				where table_schema = ? and (table_name, column_name) in (('produto', 'sabor'),
				      ('item_pedido', 'recheio'), ('item_pedido', 'cobertura'))
				""", SCHEMA);

		assertThat(colunas).isEmpty();
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

	private long produto(long loja, String nome, String sabor, boolean ativo) {
		return id("""
				insert into %s.produto (estabelecimento_id, unidade_medida_id, nome, sabor, preco, ativo)
				values (?, 1, ?, ?, 10.00, ?) returning id
				""", loja, nome, sabor, ativo);
	}

	private void item(long pedido, long produto, String recheio, String cobertura, String observacao) {
		jdbc.update(sql("""
				insert into %s.item_pedido (pedido_id, produto_id, quantidade, preco_unitario, subtotal, recheio,
				                            cobertura, observacao)
				values (?, ?, 1, 10.00, 10.00, ?, ?, ?)
				"""), pedido, produto, recheio, cobertura, observacao);
	}

	private long id(String comando, Object... parametros) {
		return jdbc.queryForObject(sql(comando), Long.class, parametros);
	}

	private static String sql(String comando) {
		return comando.formatted(SCHEMA);
	}

}
