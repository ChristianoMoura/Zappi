package br.com.zappi.pedido;

import static br.com.zappi.pedido.CadastroPedidoTests.hoje;
import static br.com.zappi.pedido.CadastroPedidoTests.item;
import static br.com.zappi.pedido.CadastroPedidoTests.pedido;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
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
 * Pedido enviado pelo cliente no cardápio público, sem login (ZAP-109), com a Casa Belt e o
 * cardápio da V2. Tudo é desfeito no fim de cada teste.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@Transactional
class PedidoPeloPortalTests {

	private static final String ENVIO = "/api/cardapio/casa-belt/pedidos";

	private static final String CARLA = "5511988887777";

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private JdbcTemplate jdbc;

	@Autowired
	private JsonMapper json;

	@Autowired
	private ServicoToken servicoToken;

	private long casaBelt;

	private long brigadeiro;

	private long coxinha;

	@BeforeEach
	void prepara() {
		casaBelt = jdbc.queryForObject("select id from estabelecimento where slug = 'casa-belt'", Long.class);
		brigadeiro = produto("Brigadeiro de chocolate");
		coxinha = produto("Coxinha por unidade");
	}

	@Test
	void entraComoNovoNoQuadroDaLidiaComOPrecoDoCardapio() throws Exception {
		Map<String, Object> corpo = pedido("  Carla Nova  ", CARLA, daquiA(7),
				List.of(item(brigadeiro, 1.5, Map.of("recheio", "Brigadeiro", "precoUnitario", 0.01, "subtotal", 0.01)),
						item(coxinha, 50, Map.of())));
		corpo.put("valorTotal", 1);

		enviar(corpo)
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.numero").value(3))
			.andExpect(jsonPath("$.length()").value(1));

		Map<String, Object> gravado = jdbc.queryForMap("""
				select p.status, p.valor_total, p.data_retirada, c.nome, c.consentimento_lgpd
				from pedido p join cliente c on c.id = p.cliente_id
				where p.estabelecimento_id = ? and p.numero = 3
				""", casaBelt);
		assertThat(((Number) gravado.get("status")).intValue()).isEqualTo(1);
		assertThat((BigDecimal) gravado.get("valor_total")).isEqualByComparingTo("212.50");
		assertThat(gravado).containsEntry("nome", "Carla Nova").containsEntry("consentimento_lgpd", true);

		// A Lídia vê o pedido na coluna Novo
		mockMvc.perform(get("/api/pedidos/3").header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenDaLidia()))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.status").value(1))
			.andExpect(jsonPath("$.cliente.nome").value("Carla Nova"))
			.andExpect(jsonPath("$.itens[0].precoUnitario").value(100.00))
			.andExpect(jsonPath("$.itens[0].recheio").value("Brigadeiro"));
	}

	@Test
	void registraOLogSemUsuarioEComAOrigem() throws Exception {
		enviar(pedido("Carla", CARLA, daquiA(8), List.of(item(brigadeiro, 1, Map.of())))).andExpect(status().isCreated());

		Map<String, Object> log = jdbc.queryForMap("""
				select usuario_id, estabelecimento_id, detalhes ->> 'origem' as origem, detalhes ->> 'numero' as numero
				from log_auditoria where acao = 'PEDIDO_CRIADO'
				""");
		assertThat(log.get("usuario_id")).isNull();
		assertThat(((Number) log.get("estabelecimento_id")).longValue()).isEqualTo(casaBelt);
		assertThat(log).containsEntry("origem", "PORTAL_CLIENTE").containsEntry("numero", "3");
	}

	@Test
	void clienteQueJaExisteNaoTemONomeMudadoNemERevelado() throws Exception {
		long ana = jdbc.queryForObject("select id from cliente where telefone_whatsapp = '5511900000001'", Long.class);

		String paraCliente = enviar(pedido("Outro Nome", "5511900000001", daquiA(7), List.of(item(brigadeiro, 1, Map.of()))))
			.andExpect(status().isCreated())
			.andReturn().getResponse().getContentAsString();
		String paraNovo = enviar(pedido("Carla", CARLA, daquiA(7), List.of(item(brigadeiro, 1, Map.of()))))
			.andExpect(status().isCreated())
			.andReturn().getResponse().getContentAsString();

		assertThat(jdbc.queryForObject("select nome from cliente where id = ?", String.class, ana)).isEqualTo("Ana Exemplo");
		assertThat(jdbc.queryForObject("select cliente_id from pedido where estabelecimento_id = ? and numero = 3",
				Long.class, casaBelt)).isEqualTo(ana);
		// A resposta tem o mesmo formato nos dois casos: só o número
		assertThat(paraCliente).isEqualTo("{\"numero\":3}");
		assertThat(paraNovo).isEqualTo("{\"numero\":4}");
	}

	@Test
	void exigeSeteDiasDeAntecedenciaEmQualquerHorario() throws Exception {
		LocalDate primeiraData = hoje().plusDays(7);

		enviar(pedido("Carla", CARLA, hoje().plusDays(6).atTime(20, 0), List.of(item(brigadeiro, 1, Map.of()))))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.campos.dataRetirada").value("Escolha uma data a partir de "
					+ primeiraData.format(DateTimeFormatter.ofPattern("dd/MM"))
					+ ". A loja precisa de pelo menos 7 dias para preparar a encomenda."));
		nadaFoiGravado();

		enviar(pedido("Carla", CARLA, primeiraData.atTime(8, 0), List.of(item(brigadeiro, 1, Map.of()))))
			.andExpect(status().isCreated());
	}

	@Test
	void aceitaADataEHoraComFusoENoHorarioDeSaoPaulo() throws Exception {
		LocalDate dia = hoje().plusDays(9);
		Map<String, Object> comFuso = pedido("Carla", CARLA, dia, List.of(item(brigadeiro, 1, Map.of())));
		comFuso.put("dataRetirada", dia + "T15:00:00-03:00");
		Map<String, Object> emUtc = pedido("Carla", CARLA, dia, List.of(item(brigadeiro, 1, Map.of())));
		emUtc.put("dataRetirada", dia + "T21:30:00Z");

		enviar(comFuso).andExpect(status().isCreated());
		enviar(emUtc).andExpect(status().isCreated());

		assertThat(jdbc.queryForList("select data_retirada from pedido where numero > 2 order by numero",
				LocalDateTime.class))
			.containsExactly(dia.atTime(15, 0), dia.atTime(18, 30));
	}

	@Test
	void recusaHorarioForaDaFaixaEDataInvalida() throws Exception {
		enviar(pedido("Carla", CARLA, hoje().plusDays(8).atTime(21, 0), List.of(item(brigadeiro, 1, Map.of()))))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.campos.dataRetirada").value("Escolha um horário entre 8h e 20h, de 30 em 30 minutos."));

		Map<String, Object> invalida = pedido("Carla", CARLA, hoje().plusDays(8), List.of(item(brigadeiro, 1, Map.of())));
		invalida.put("dataRetirada", "amanhã à tarde");
		enviar(invalida)
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.codigo").value("DADOS_INVALIDOS"));
		nadaFoiGravado();
	}

	@Test
	void soAceitaProdutosAtivosDaPropriaLoja() throws Exception {
		long excluido = produto("Ninho com morango");
		jdbc.update("update produto set ativo = false where id = ?", excluido);
		long outraLoja = jdbc.queryForObject("""
				insert into estabelecimento (nome, slug, telefone_whatsapp)
				values ('Doces da Ana', 'doces-da-ana', '5511900000009') returning id
				""", Long.class);
		long deOutraLoja = jdbc.queryForObject("""
				insert into produto (estabelecimento_id, unidade_medida_id, nome, sabor, preco)
				values (?, 1, 'Bolo', 'Cenoura', 90.00) returning id
				""", Long.class, outraLoja);

		enviar(pedido("Carla", CARLA, daquiA(7), List.of(item(excluido, 1, Map.of()), item(deOutraLoja, 1, Map.of()),
				item(coxinha, 1.5, Map.of()))))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.campos['itens[0].produtoId']").value("Escolha um produto do cardápio."))
			.andExpect(jsonPath("$.campos['itens[1].produtoId']").value("Escolha um produto do cardápio."))
			.andExpect(jsonPath("$.campos['itens[2].quantidade']")
				.value("Este produto é vendido por unidade: use um número inteiro."));
		nadaFoiGravado();
	}

	@Test
	void semNomeWhatsappValidoOuConsentimentoNadaEGravado() throws Exception {
		Map<String, Object> corpo = pedido(" ", "11988887777", daquiA(7), List.of(item(brigadeiro, 1, Map.of())));
		corpo.put("consentimentoLgpd", false);

		enviar(corpo)
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.campos['cliente.nome']").value("Escreva o nome do cliente."))
			.andExpect(jsonPath("$.campos['cliente.telefone']").exists())
			.andExpect(jsonPath("$.campos.consentimentoLgpd")
				.value("Confirme que o cliente autorizou o uso do nome e do WhatsApp."));
		nadaFoiGravado();
	}

	@Test
	void lojaInexistenteOuDesativadaDa404() throws Exception {
		Map<String, Object> corpo = pedido("Carla", CARLA, daquiA(7), List.of(item(brigadeiro, 1, Map.of())));

		mockMvc.perform(post("/api/cardapio/nao-existe/pedidos").contentType(MediaType.APPLICATION_JSON)
			.content(json.writeValueAsString(corpo)))
			.andExpect(status().isNotFound())
			.andExpect(jsonPath("$.codigo").value("ESTABELECIMENTO_NAO_ENCONTRADO"));

		jdbc.update("update estabelecimento set ativo = false where id = ?", casaBelt);
		enviar(corpo).andExpect(status().isNotFound());
		nadaFoiGravado();
	}

	private ResultActions enviar(Map<String, Object> corpo) throws Exception {
		return mockMvc.perform(post(ENVIO).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(corpo)));
	}

	private void nadaFoiGravado() {
		assertThat(jdbc.queryForObject("select count(*) from pedido where estabelecimento_id = ?", Integer.class,
				casaBelt)).isEqualTo(2);
		assertThat(jdbc.queryForObject("select count(*) from cliente where telefone_whatsapp = ?", Integer.class, CARLA))
			.isZero();
		assertThat(jdbc.queryForObject("select count(*) from log_auditoria where acao = 'PEDIDO_CRIADO'", Integer.class))
			.isZero();
	}

	/** Dia de retirada a {@code dias} de hoje, ao meio-dia (horário permitido, RN23). */
	private static LocalDate daquiA(int dias) {
		return hoje().plusDays(dias);
	}

	private long produto(String sabor) {
		return jdbc.queryForObject("select id from produto where estabelecimento_id = ? and sabor = ?", Long.class,
				casaBelt, sabor);
	}

	private String tokenDaLidia() {
		Map<String, Object> lidia = jdbc.queryForMap(
				"select id, estabelecimento_id from usuario where email = 'lidia@casabelt.com'");
		return servicoToken.gerar(new UsuarioAutenticado(((Number) lidia.get("id")).longValue(), casaBelt));
	}

}
