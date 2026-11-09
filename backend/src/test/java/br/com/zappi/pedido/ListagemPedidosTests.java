package br.com.zappi.pedido;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import br.com.zappi.TestcontainersConfiguration;
import br.com.zappi.seguranca.ServicoToken;
import br.com.zappi.seguranca.UsuarioAutenticado;

/**
 * Listagem de pedidos para o quadro (ZAP-44). Além dos 2 pedidos Novos da V2 (#1 Ana e #2
 * Bruno), cada teste cria pedidos nas outras etapas; tudo é desfeito no fim do teste.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@Transactional
class ListagemPedidosTests {

	/** O item de Ninho do pedido #2, sem depender da ordem dos itens. */
	private static final String NINHO = "$[1].itens[?(@.sabor == 'Ninho com morango')]";

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private JdbcTemplate jdbc;

	@Autowired
	private ServicoToken servicoToken;

	private long casaBelt;

	private String token;

	@BeforeEach
	void preparaPedidos() {
		Map<String, Object> lidia = jdbc.queryForMap(
				"select id, estabelecimento_id from usuario where email = 'lidia@casabelt.com'");
		casaBelt = ((Number) lidia.get("estabelecimento_id")).longValue();
		token = servicoToken.gerar(new UsuarioAutenticado(((Number) lidia.get("id")).longValue(), casaBelt));

		long ana = jdbc.queryForObject("select id from cliente where telefone_whatsapp = '5511900000001'", Long.class);
		long anonimizado = jdbc.queryForObject("""
				insert into cliente (estabelecimento_id, nome, telefone_whatsapp, consentimento_lgpd, consentimento_em, anonimizado_em)
				values (?, 'Cliente anonimizado', '0000000000099', true, now(), now()) returning id
				""", Long.class, casaBelt);

		// #3 Confirmado, #4 Em produção, #5 Concluído, #6 Recusado (direto), #7 Cancelado (recusado depois de confirmado)
		pedido(3, 2, ana, "current_date + 1", "confirmado_em = now()", null);
		pedido(4, 3, ana, "current_date + 2", "confirmado_em = now(), producao_em = now()", null);
		pedido(5, 4, anonimizado, "current_date", "confirmado_em = now(), producao_em = now(), concluido_em = now()", null);
		pedido(6, 5, ana, "current_date + 4", "recusado_em = now()", "Agenda cheia nesse dia.");
		pedido(7, 5, ana, "current_date + 4", "confirmado_em = now(), recusado_em = now()", "Cliente desistiu.");
	}

	@Test
	void listaPorColunaSemOsRecusados() throws Exception {
		listar("")
			.andExpect(status().isOk())
			.andExpect(jsonPath("$[*].numero", contains(1, 2, 3, 4, 5)))
			.andExpect(jsonPath("$[*].status", contains(1, 1, 2, 3, 4)));
	}

	@Test
	void incluiOsRecusadosComOFiltro() throws Exception {
		listar("?recusados=true")
			.andExpect(jsonPath("$[*].numero", contains(1, 2, 3, 4, 5, 6, 7)))
			.andExpect(jsonPath("$[5].cancelado").value(false))
			.andExpect(jsonPath("$[5].motivoRecusa").value("Agenda cheia nesse dia."))
			.andExpect(jsonPath("$[6].cancelado").value(true))
			.andExpect(jsonPath("$[6].motivoRecusa").value("Cliente desistiu."));
	}

	@Test
	void trazClienteItensETotalDoPedido() throws Exception {
		// Pedido #2 da V2: cento de coxinha + 1,5 kg de Ninho com morango
		listar("")
			.andExpect(jsonPath("$[1].numero").value(2))
			.andExpect(jsonPath("$[1].cliente.nome").value("Bruno Exemplo"))
			.andExpect(jsonPath("$[1].cliente.telefone").value("5511900000002"))
			.andExpect(jsonPath("$[1].cliente.anonimizado").value(false))
			.andExpect(jsonPath("$[1].valorTotal").value(292.50))
			.andExpect(jsonPath("$[1].itens[*].sabor", containsInAnyOrder("Cento de coxinha", "Ninho com morango")))
			.andExpect(jsonPath(NINHO + ".produto", contains("Bolo")))
			.andExpect(jsonPath(NINHO + ".unidade", contains("KG")))
			.andExpect(jsonPath(NINHO + ".quantidade", contains(1.5)))
			.andExpect(jsonPath(NINHO + ".precoUnitario", contains(115.0)))
			.andExpect(jsonPath(NINHO + ".subtotal", contains(172.5)))
			.andExpect(jsonPath("$[0].itens[0].recheio").value("Brigadeiro"))
			.andExpect(jsonPath("$[0].dataRetirada").isString());
	}

	@Test
	void trazAsDatasSoDasEtapasPelasQuaisPassou() throws Exception {
		listar("")
			.andExpect(jsonPath("$[0].criadoEm").isString())
			.andExpect(jsonPath("$[0].confirmadoEm").value(nullValue()))
			.andExpect(jsonPath("$[3].numero").value(4))
			.andExpect(jsonPath("$[3].confirmadoEm").isString())
			.andExpect(jsonPath("$[3].producaoEm").isString())
			.andExpect(jsonPath("$[3].concluidoEm").value(nullValue()))
			.andExpect(jsonPath("$[4].concluidoEm").isString());
	}

	@Test
	void naoExpoeOsDadosDoClienteAnonimizado() throws Exception {
		listar("")
			.andExpect(jsonPath("$[4].numero").value(5))
			.andExpect(jsonPath("$[4].cliente.nome").value("Cliente anonimizado"))
			.andExpect(jsonPath("$[4].cliente.telefone").value(nullValue()))
			.andExpect(jsonPath("$[4].cliente.anonimizado").value(true));
	}

	@Test
	void naoMostraPedidosDeOutroEstabelecimento() throws Exception {
		long outraLoja = jdbc.queryForObject("""
				insert into estabelecimento (nome, slug, telefone_whatsapp)
				values ('Doces da Ana', 'doces-da-ana-pedidos', '5511900000009') returning id
				""", Long.class);
		long ana = jdbc.queryForObject("""
				insert into usuario (estabelecimento_id, nome, email, senha_hash)
				values (?, 'Ana', 'ana@docesdaana.com', 'hash-de-teste') returning id
				""", Long.class, outraLoja);

		mockMvc.perform(get("/api/pedidos?recusados=true")
			.header(HttpHeaders.AUTHORIZATION, "Bearer " + servicoToken.gerar(new UsuarioAutenticado(ana, outraLoja))))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.length()").value(0));
	}

	@Test
	void exigeOToken() throws Exception {
		mockMvc.perform(get("/api/pedidos")).andExpect(status().isUnauthorized());
	}

	private ResultActions listar(String filtro) throws Exception {
		return mockMvc.perform(get("/api/pedidos" + filtro).header(HttpHeaders.AUTHORIZATION, "Bearer " + token));
	}

	/** Pedido com um item de bolo de brigadeiro (1 kg a R$ 100,00) e as datas da etapa. */
	private void pedido(int numero, int status, long cliente, String retirada, String datas, String motivo) {
		long id = jdbc.queryForObject("""
				insert into pedido (estabelecimento_id, cliente_id, numero, status, data_retirada, motivo_recusa, valor_total)
				values (?, ?, ?, ?, %s, ?, 100.00) returning id
				""".formatted(retirada), Long.class, casaBelt, cliente, numero, status, motivo);
		jdbc.update("update pedido set " + datas + " where id = ?", id);
		jdbc.update("""
				insert into item_pedido (pedido_id, produto_id, quantidade, preco_unitario, subtotal)
				select ?, id, 1.000, 100.00, 100.00 from produto
				where estabelecimento_id = ? and sabor = 'Brigadeiro de chocolate'
				""", id, casaBelt);
	}

}
