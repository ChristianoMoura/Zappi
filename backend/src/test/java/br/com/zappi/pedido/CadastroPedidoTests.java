package br.com.zappi.pedido;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import br.com.zappi.TestcontainersConfiguration;
import br.com.zappi.seguranca.ServicoToken;
import br.com.zappi.seguranca.UsuarioAutenticado;
import tools.jackson.databind.json.JsonMapper;

/**
 * Cadastro do pedido (ZAP-88), com o cardápio e os pedidos #1 e #2 da V2. Tudo é desfeito no
 * fim de cada teste.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@Transactional
class CadastroPedidoTests {

	private static final String CARLA = "5511988887777";

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private JdbcTemplate jdbc;

	@Autowired
	private ServicoToken servicoToken;

	@Autowired
	private JsonMapper json;

	private long casaBelt;

	private String token;

	private long brigadeiro;

	private long coxinha;

	@BeforeEach
	void prepara() {
		Map<String, Object> lidia = jdbc.queryForMap(
				"select id, estabelecimento_id from usuario where email = 'lidia@casabelt.com'");
		casaBelt = ((Number) lidia.get("estabelecimento_id")).longValue();
		token = servicoToken.gerar(new UsuarioAutenticado(((Number) lidia.get("id")).longValue(), casaBelt));
		brigadeiro = produto("Brigadeiro de chocolate");
		coxinha = produto("Coxinha por unidade");
	}

	@Test
	void cadastraComONumeroSeguinteEOPrecoDoCardapio() throws Exception {
		Map<String, Object> pedido = pedido("  Carla Nova  ", CARLA, hoje().plusDays(2),
				List.of(item(brigadeiro, 1.5, Map.of("recheio", "  ", "cobertura", " Granulado ")),
						// O preço que a tela manda é ignorado: vale o do cardápio (RN10)
						item(coxinha, 50, Map.of("precoUnitario", 0.01))));
		pedido.put("observacao", "  Sem lactose.  ");

		cadastrar(pedido)
			.andExpect(status().isCreated())
			.andExpect(header().string(HttpHeaders.LOCATION, "/api/pedidos/3"))
			.andExpect(jsonPath("$.numero").value(3))
			.andExpect(jsonPath("$.status").value(1))
			.andExpect(jsonPath("$.observacao").value("Sem lactose."))
			.andExpect(jsonPath("$.cliente.nome").value("Carla Nova"))
			.andExpect(jsonPath("$.cliente.telefone").value(CARLA))
			.andExpect(jsonPath("$.criadoEm").isString())
			.andExpect(jsonPath("$.confirmadoEm").value(nullValue()))
			.andExpect(jsonPath("$.itens.length()").value(2))
			.andExpect(jsonPath("$.itens[0].produtoId").value(brigadeiro))
			.andExpect(jsonPath("$.itens[0].quantidade").value(1.5))
			.andExpect(jsonPath("$.itens[0].precoUnitario").value(100.00))
			.andExpect(jsonPath("$.itens[0].subtotal").value(150.00))
			.andExpect(jsonPath("$.itens[0].recheio").value(nullValue()))
			.andExpect(jsonPath("$.itens[0].cobertura").value("Granulado"))
			.andExpect(jsonPath("$.itens[1].precoUnitario").value(1.25))
			.andExpect(jsonPath("$.itens[1].subtotal").value(62.50))
			.andExpect(jsonPath("$.valorTotal").value(212.50))
			.andExpect(jsonPath("$.mensagens.length()").value(0));

		Map<String, Object> cliente = jdbc.queryForMap("""
				select id, nome, consentimento_lgpd, consentimento_em from cliente
				where estabelecimento_id = ? and telefone_whatsapp = ?
				""", casaBelt, CARLA);
		assertThat(cliente).containsEntry("nome", "Carla Nova").containsEntry("consentimento_lgpd", true);
		assertThat(cliente.get("consentimento_em")).isNotNull();
		assertThat(jdbc.queryForMap("""
				select detalhes ->> 'numero' as numero, detalhes ->> 'clienteId' as cliente,
				       detalhes ->> 'valorTotal' as total, detalhes ->> 'itens' as itens
				from log_auditoria where acao = 'PEDIDO_CRIADO'
				"""))
			.containsEntry("numero", "3")
			.containsEntry("cliente", cliente.get("id").toString())
			.containsEntry("total", "212.50")
			.containsEntry("itens", "2");
	}

	@Test
	void cadastrosSeguidosRecebemNumerosSeguidos() throws Exception {
		cadastrar(pedido("Carla", CARLA, hoje(), List.of(item(brigadeiro, 1, Map.of()))))
			.andExpect(jsonPath("$.numero").value(3));
		cadastrar(pedido("Carla", CARLA, hoje(), List.of(item(brigadeiro, 1, Map.of()))))
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.numero").value(4));

		assertThat(jdbc.queryForObject("select count(*) from cliente where telefone_whatsapp = ?", Integer.class, CARLA))
			.isEqualTo(1);
	}

	@Test
	void oMesmoWhatsappEOClienteQueJaExiste() throws Exception {
		long ana = jdbc.queryForObject("select id from cliente where telefone_whatsapp = '5511900000001'", Long.class);
		int clientes = jdbc.queryForObject("select count(*) from cliente", Integer.class);

		cadastrar(pedido("Ana Souza", "5511900000001", hoje(), List.of(item(coxinha, 10, Map.of()))))
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.cliente.nome").value("Ana Exemplo"));

		assertThat(jdbc.queryForObject("select count(*) from cliente", Integer.class)).isEqualTo(clientes);
		assertThat(jdbc.queryForObject("select cliente_id from pedido where estabelecimento_id = ? and numero = 3",
				Long.class, casaBelt)).isEqualTo(ana);
	}

	@Test
	void recusaDataQueJaPassou() throws Exception {
		cadastrar(pedido("Carla", CARLA, hoje().minusDays(1), List.of(item(brigadeiro, 1, Map.of()))))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.codigo").value("DADOS_INVALIDOS"))
			.andExpect(jsonPath("$.campos.dataRetirada")
				.value("A data de retirada já passou. Escolha hoje ou um dia depois."));
		nadaFoiGravado();
	}

	@Test
	void soAceitaProdutosAtivosDoCardapio() throws Exception {
		long excluido = produto("Ninho com morango");
		jdbc.update("update produto set ativo = false where id = ?", excluido);
		long outraLoja = jdbc.queryForObject("""
				insert into estabelecimento (nome, slug, telefone_whatsapp)
				values ('Doces da Ana', 'doces-da-ana-cadastro', '5511900000009') returning id
				""", Long.class);
		long deOutraLoja = jdbc.queryForObject("""
				insert into produto (estabelecimento_id, unidade_medida_id, nome, sabor, preco)
				values (?, 1, 'Bolo', 'Cenoura', 90.00) returning id
				""", Long.class, outraLoja);

		cadastrar(pedido("Carla", CARLA, hoje(), List.of(item(brigadeiro, 1, Map.of()), item(excluido, 1, Map.of()),
				item(deOutraLoja, 1, Map.of()), item(999_999, 1, Map.of()))))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.campos.length()").value(3))
			.andExpect(jsonPath("$.campos['itens[1].produtoId']").value("Escolha um produto do cardápio."))
			.andExpect(jsonPath("$.campos['itens[2].produtoId']").value("Escolha um produto do cardápio."))
			.andExpect(jsonPath("$.campos['itens[3].produtoId']").value("Escolha um produto do cardápio."));
		nadaFoiGravado();
	}

	@Test
	void produtoPorUnidadeSoAceitaNumeroInteiro() throws Exception {
		cadastrar(pedido("Carla", CARLA, hoje(), List.of(item(brigadeiro, 1.25, Map.of()), item(coxinha, 1.5, Map.of()))))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.campos.length()").value(1))
			.andExpect(jsonPath("$.campos['itens[1].quantidade']")
				.value("Este produto é vendido por unidade: use um número inteiro."));

		cadastrar(pedido("Carla", CARLA, hoje(), List.of(item(coxinha, 2.0, Map.of()))))
			.andExpect(status().isCreated());
	}

	@Test
	void confereOsCampos() throws Exception {
		Map<String, Object> pedido = pedido(" ", "11900000000", hoje(), List.of());
		pedido.put("consentimentoLgpd", false);
		pedido.put("observacao", "x".repeat(501));

		cadastrar(pedido)
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.campos['cliente.nome']").value("Escreva o nome do cliente."))
			.andExpect(jsonPath("$.campos['cliente.telefone']")
				.value("O WhatsApp precisa ter DDD e 9 números. Ex.: (11) 90000-0000"))
			.andExpect(jsonPath("$.campos.consentimentoLgpd")
				.value("Confirme que o cliente autorizou o uso do nome e do WhatsApp."))
			.andExpect(jsonPath("$.campos.observacao").value("Use no máximo 500 caracteres."))
			.andExpect(jsonPath("$.campos.itens").value("Adicione pelo menos um item."));

		cadastrar(pedido("Carla", CARLA, hoje(), List.of(item(brigadeiro, 0, Map.of()),
				item(brigadeiro, 1.2345, Map.of()), item(brigadeiro, 100_000, Map.of()),
				item(brigadeiro, 1, Map.of("recheio", "x".repeat(101), "observacao", "x".repeat(301))))))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.campos['itens[0].quantidade']")
				.value("A quantidade precisa ser um número maior que zero."))
			.andExpect(jsonPath("$.campos['itens[1].quantidade']")
				.value("Use no máximo 3 casas depois da vírgula. Ex.: 1,5"))
			.andExpect(jsonPath("$.campos['itens[2].quantidade']").value("Confira a quantidade: ela está alta demais."))
			.andExpect(jsonPath("$.campos['itens[3].recheio']").value("Use no máximo 100 caracteres."))
			.andExpect(jsonPath("$.campos['itens[3].observacao']").value("Use no máximo 300 caracteres."));
		nadaFoiGravado();
	}

	@Test
	void semConsentimentoNaoGravaOCliente() throws Exception {
		Map<String, Object> pedido = pedido("Carla", CARLA, hoje(), List.of(item(brigadeiro, 1, Map.of())));
		pedido.remove("consentimentoLgpd");

		cadastrar(pedido)
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.campos.consentimentoLgpd")
				.value("Confirme que o cliente autorizou o uso do nome e do WhatsApp."));
		nadaFoiGravado();
	}

	@Test
	void exigeOToken() throws Exception {
		mockMvc.perform(post("/api/pedidos").contentType(MediaType.APPLICATION_JSON)
			.content(json.writeValueAsString(pedido("Carla", CARLA, hoje(), List.of(item(brigadeiro, 1, Map.of()))))))
			.andExpect(status().isUnauthorized());
	}

	private void nadaFoiGravado() {
		assertThat(jdbc.queryForObject("select count(*) from pedido where estabelecimento_id = ?", Integer.class,
				casaBelt)).isEqualTo(2);
		assertThat(jdbc.queryForObject("select count(*) from cliente where telefone_whatsapp = ?", Integer.class, CARLA))
			.isZero();
		assertThat(jdbc.queryForObject("select count(*) from log_auditoria where acao = 'PEDIDO_CRIADO'", Integer.class))
			.isZero();
	}

	private ResultActions cadastrar(Map<String, Object> pedido) throws Exception {
		return mockMvc.perform(post("/api/pedidos").header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
			.contentType(MediaType.APPLICATION_JSON)
			.content(json.writeValueAsString(pedido)));
	}

	private long produto(String sabor) {
		return jdbc.queryForObject("select id from produto where estabelecimento_id = ? and sabor = ?", Long.class,
				casaBelt, sabor);
	}

	static Map<String, Object> pedido(String nome, String telefone, LocalDate dataRetirada,
			List<Map<String, Object>> itens) {
		Map<String, Object> pedido = new HashMap<>();
		pedido.put("cliente", Map.of("nome", nome, "telefone", telefone));
		pedido.put("consentimentoLgpd", true);
		pedido.put("dataRetirada", dataRetirada.toString());
		pedido.put("observacao", "");
		pedido.put("itens", itens);
		return pedido;
	}

	static Map<String, Object> item(long produtoId, Number quantidade, Map<String, Object> outros) {
		Map<String, Object> item = new HashMap<>(outros);
		item.put("produtoId", produtoId);
		item.put("quantidade", quantidade);
		return item;
	}

	static LocalDate hoje() {
		return LocalDate.now(ZoneId.of("America/Sao_Paulo"));
	}

}
