package br.com.zappi;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

/**
 * Migrações do Flyway (ZAP-72) contra um PostgreSQL real. A aplicação só sobe se as
 * entidades baterem com as tabelas (ddl-auto: validate). Os testes de cada restrição
 * da seção 13.3 ficam na ZAP-74.
 */
@SpringBootTest
@Import(TestcontainersConfiguration.class)
@Transactional
class MigracoesTests {

	/** As nove do dicionário de dados (Atividade #14) e a categoria (ZAP-137). */
	private static final List<String> TABELAS = List.of("estabelecimento", "usuario", "unidade_medida", "produto",
			"cliente", "pedido", "item_pedido", "mensagem_whatsapp", "log_auditoria", "categoria");

	@Autowired
	private JdbcTemplate jdbc;

	@Test
	void criaAsTabelasComRlsLigado() {
		List<Map<String, Object>> tabelas = jdbc.queryForList("""
				select c.relname as tabela, c.relrowsecurity as rls
				from pg_class c join pg_namespace n on n.oid = c.relnamespace
				where n.nspname = 'public' and c.relkind = 'r' and c.relname <> 'flyway_schema_history'
				""");

		assertThat(tabelas).extracting(linha -> linha.get("tabela")).containsExactlyInAnyOrderElementsOf(TABELAS);
		assertThat(tabelas).allSatisfy(linha -> assertThat(linha.get("rls")).isEqualTo(true));
	}

	@Test
	void criaAsUnidadesDeMedidaFixas() {
		List<Map<String, Object>> unidades = jdbc
			.queryForList("select id, sigla, permite_fracao from unidade_medida order by id");

		assertThat(unidades).hasSize(2);
		assertThat(unidades.get(0)).containsEntry("sigla", "KG").containsEntry("permite_fracao", true);
		assertThat(unidades.get(1)).containsEntry("sigla", "UN").containsEntry("permite_fracao", false);
	}

	@Test
	void pedidosAntigosMantemADataERecebemOHorarioPadrao() {
		List<Map<String, Object>> pedidos = jdbc.queryForList("""
				select p.data_retirada::date - p.criado_em::date as dias, p.data_retirada::time::text as hora
				from pedido p join estabelecimento e on e.id = p.estabelecimento_id
				where e.slug = 'casa-belt' and p.numero in (1, 2) order by p.numero
				""");

		// Na V2, os pedidos #1 e #2 eram só data: hoje + 3 e hoje + 5; a V4 acrescenta 12:00
		assertThat(pedidos).extracting(pedido -> ((Number) pedido.get("dias")).intValue()).containsExactly(3, 5);
		assertThat(pedidos).allSatisfy(pedido -> assertThat(pedido).containsEntry("hora", "12:00:00"));
	}

	@Test
	void aceitaPedidoComClienteDoMesmoEstabelecimento() {
		long estabelecimento = criarEstabelecimento("confeitaria-a");
		long cliente = criarCliente(estabelecimento, "5511900000001");

		criarPedido(estabelecimento, cliente);

		assertThat(jdbc.queryForObject("select count(*) from pedido where estabelecimento_id = ?", Integer.class,
				estabelecimento))
			.isEqualTo(1);
	}

	@Test
	void recusaPedidoComClienteDeOutroEstabelecimento() {
		long confeitariaA = criarEstabelecimento("confeitaria-a");
		long confeitariaB = criarEstabelecimento("confeitaria-b");
		long clienteDaB = criarCliente(confeitariaB, "5511900000002");

		assertThatThrownBy(() -> criarPedido(confeitariaA, clienteDaB))
			.isInstanceOf(DataIntegrityViolationException.class)
			.hasMessageContaining("fk_pedido_cliente");
	}

	@Test
	void criaGlutenEAlergenosDoProdutoComoOpcionais() {
		List<Map<String, Object>> colunas = jdbc.queryForList("""
				select column_name, data_type, character_maximum_length, is_nullable, column_default
				from information_schema.columns
				where table_name = 'produto' and column_name in ('contem_gluten', 'outros_alergenos')
				order by column_name
				""");

		assertThat(colunas).hasSize(2);
		assertThat(colunas.get(0)).containsEntry("column_name", "contem_gluten")
			.containsEntry("data_type", "boolean")
			.containsEntry("is_nullable", "YES")
			.containsEntry("column_default", null);
		assertThat(colunas.get(1)).containsEntry("column_name", "outros_alergenos")
			.containsEntry("data_type", "character varying")
			.containsEntry("character_maximum_length", 300)
			.containsEntry("is_nullable", "YES");
	}

	@Test
	void produtoSemGlutenInformadoFicaComoNaoInformado() {
		long estabelecimento = criarEstabelecimento("confeitaria-a");

		Map<String, Object> produto = jdbc.queryForMap("""
				with categoria as (
				    insert into categoria (estabelecimento_id, nome, ordem) values (?, 'Bolos', 1) returning id
				)
				insert into produto (estabelecimento_id, categoria_id, unidade_medida_id, nome, preco)
				select ?, categoria.id, 1, 'Bolo de brigadeiro', 100.00 from categoria
				returning contem_gluten, outros_alergenos
				""", estabelecimento, estabelecimento);

		assertThat(produto).containsEntry("contem_gluten", null).containsEntry("outros_alergenos", null);
	}

	@Test
	void produtoTemCategoriaENomeUnicoSemSabor() {
		assertThat(coluna("produto", "categoria_id")).containsEntry("is_nullable", "NO");
		assertThat(coluna("produto", "nome")).containsEntry("character_maximum_length", 150);
		assertThat(coluna("item_pedido", "observacao")).containsEntry("character_maximum_length", 600);
		assertThat(jdbc.queryForList("""
				select table_name || '.' || column_name from information_schema.columns
				where table_schema = 'public'
				  and (table_name, column_name) in (('produto', 'sabor'), ('item_pedido', 'recheio'),
				                                    ('item_pedido', 'cobertura'))
				""", String.class)).isEmpty();
	}

	@Test
	void cardapioDaV2GanhaCategoriasNomesCompletosEORecheioNaObservacao() {
		assertThat(jdbc.queryForList("""
				select c.nome || ':' || c.ordem from categoria c join estabelecimento e on e.id = c.estabelecimento_id
				where e.slug = 'casa-belt' order by c.ordem
				""", String.class)).containsExactly("Bolos:1", "Salgados:2");
		assertThat(jdbc.queryForList("""
				select p.nome || ' > ' || c.nome from produto p join categoria c on c.id = p.categoria_id
				join estabelecimento e on e.id = p.estabelecimento_id
				where e.slug = 'casa-belt' order by p.id
				""", String.class)).containsExactly("Bolo de brigadeiro de chocolate > Bolos",
						"Bolo de ninho com morango > Bolos", "Cento de coxinha > Salgados",
						"Coxinha por unidade > Salgados");
		// Pedido #1 da V2: 2 kg de brigadeiro com recheio "Brigadeiro" e cobertura "Granulado"
		assertThat(jdbc.queryForObject("""
				select i.observacao from item_pedido i join pedido p on p.id = i.pedido_id
				join estabelecimento e on e.id = p.estabelecimento_id
				where e.slug = 'casa-belt' and p.numero = 1
				""", String.class)).isEqualTo("Recheio: Brigadeiro. Cobertura: Granulado.");
	}

	@Test
	void categoriaNaoRepeteONomeEntreAsAtivasDaLoja() {
		long estabelecimento = criarEstabelecimento("confeitaria-a");
		long outro = criarEstabelecimento("confeitaria-b");
		jdbc.update("insert into categoria (estabelecimento_id, nome, ordem) values (?, 'Bolos', 1)", estabelecimento);
		// Excluída e de outra loja podem ter o mesmo nome
		jdbc.update("insert into categoria (estabelecimento_id, nome, ordem, ativo) values (?, 'bolos', 2, false)",
				estabelecimento);
		jdbc.update("insert into categoria (estabelecimento_id, nome, ordem) values (?, 'Bolos', 1)", outro);

		assertThatThrownBy(() -> jdbc.update(
				"insert into categoria (estabelecimento_id, nome, ordem) values (?, 'BOLOS', 3)", estabelecimento))
			.isInstanceOf(DataIntegrityViolationException.class)
			.hasMessageContaining("uk_categoria_nome_ativa");
	}

	private Map<String, Object> coluna(String tabela, String coluna) {
		return jdbc.queryForMap("""
				select is_nullable, character_maximum_length from information_schema.columns
				where table_schema = 'public' and table_name = ? and column_name = ?
				""", tabela, coluna);
	}

	private long criarEstabelecimento(String slug) {
		return jdbc.queryForObject("""
				insert into estabelecimento (nome, slug, telefone_whatsapp)
				values (?, ?, '5511900000000') returning id
				""", Long.class, "Confeitaria " + slug, slug);
	}

	private long criarCliente(long estabelecimento, String telefone) {
		return jdbc.queryForObject("""
				insert into cliente (estabelecimento_id, nome, telefone_whatsapp, consentimento_lgpd, consentimento_em)
				values (?, 'Cliente de teste', ?, true, now()) returning id
				""", Long.class, estabelecimento, telefone);
	}

	private void criarPedido(long estabelecimento, long cliente) {
		jdbc.update("""
				insert into pedido (estabelecimento_id, cliente_id, numero, status, data_retirada, valor_total)
				values (?, ?, 1, 1, current_date + 7 + time '12:00', 100.00)
				""", estabelecimento, cliente);
	}

}
