package br.com.zappi.pedido;

import static br.com.zappi.pedido.CadastroPedidoTests.hoje;
import static br.com.zappi.pedido.CadastroPedidoTests.item;
import static br.com.zappi.pedido.CadastroPedidoTests.pedido;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
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
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;

import br.com.zappi.TestcontainersConfiguration;
import br.com.zappi.seguranca.ServicoToken;
import br.com.zappi.seguranca.UsuarioAutenticado;
import tools.jackson.databind.json.JsonMapper;

/**
 * Formas de pagamento aceitas pela loja e escolhidas no pedido (ZAP-190, ZAP-192): tela
 * Estabelecimento, cardápio público, pedido pelo portal e pelo painel, e a mensagem de
 * confirmação. Casa Belt e o seed da V2; tudo é desfeito no fim de cada teste.
 *
 * <p>As formas da loja mudam pela própria API, e não direto no banco, para o pedido ler o
 * estabelecimento já com a mudança.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@Transactional
class FormasDePagamentoTests {

	private static final String ESTABELECIMENTO = "/api/estabelecimento";

	private static final String CARDAPIO = "/api/cardapio/casa-belt";

	private static final String CARLA = "5511988887777";

	private static final String ANA = "5511900000001";

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private JdbcTemplate jdbc;

	@Autowired
	private JsonMapper json;

	@Autowired
	private ServicoToken servicoToken;

	private long casaBelt;

	private String token;

	private long brigadeiro;

	private long pedido1;

	private LocalDateTime retirada1;

	@BeforeEach
	void prepara() {
		Map<String, Object> lidia = jdbc.queryForMap(
				"select id, estabelecimento_id from usuario where email = 'lidia@casabelt.com'");
		casaBelt = ((Number) lidia.get("estabelecimento_id")).longValue();
		token = servicoToken.gerar(new UsuarioAutenticado(((Number) lidia.get("id")).longValue(), casaBelt));
		brigadeiro = jdbc.queryForObject("select id from produto where estabelecimento_id = ? and nome = ?",
				Long.class, casaBelt, "Bolo de brigadeiro de chocolate");
		pedido1 = jdbc.queryForObject("select id from pedido where estabelecimento_id = ? and numero = 1", Long.class,
				casaBelt);
		retirada1 = jdbc.queryForObject("select data_retirada from pedido where id = ?", LocalDateTime.class, pedido1);
	}

	// Estabelecimento

	@Test
	void lojaComecaAceitandoTodasAsFormas() throws Exception {
		comToken(get(ESTABELECIMENTO))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.formasPagamento", contains("DINHEIRO", "PIX", "CREDITO", "DEBITO", "VR")));
	}

	@Test
	void lidiaEscolheAsFormasSemRepetirENaOrdemDaListaERegistraNoLog() throws Exception {
		aceitar(List.of("VR", "PIX", "PIX"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.formasPagamento", contains("PIX", "VR")));

		assertThat(jdbc.queryForObject("select array_to_string(formas_pagamento, ',') from estabelecimento where id = ?",
				String.class, casaBelt)).isEqualTo("PIX,VR");
		assertThat(jdbc.queryForMap("""
				select detalhes -> 'antes' ->> 'formasPagamento' as antes,
				       detalhes -> 'depois' ->> 'formasPagamento' as depois
				from log_auditoria where acao = 'ESTABELECIMENTO_EDITADO' and entidade_id = ?
				""", casaBelt))
			.containsEntry("antes", "[\"DINHEIRO\", \"PIX\", \"CREDITO\", \"DEBITO\", \"VR\"]")
			.containsEntry("depois", "[\"PIX\", \"VR\"]");
	}

	@Test
	void semOCampoAsFormasContinuamComoEstavam() throws Exception {
		aceitar(List.of("PIX")).andExpect(status().isOk());

		Map<String, Object> semFormas = dadosDaLoja();
		comToken(put(ESTABELECIMENTO), semFormas)
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.formasPagamento", contains("PIX")));
	}

	@Test
	void recusaNenhumaFormaOuFormaForaDaLista() throws Exception {
		aceitar(List.of())
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.codigo").value("DADOS_INVALIDOS"))
			.andExpect(jsonPath("$.campos.formasPagamento").value("Escolha pelo menos uma forma de pagamento."));
		aceitar(List.of("PIX", "CHEQUE"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.campos.formasPagamento").value("Escolha as formas de pagamento da lista."));

		assertThat(jdbc.queryForObject("select cardinality(formas_pagamento) from estabelecimento where id = ?",
				Integer.class, casaBelt)).isEqualTo(5);
		assertThat(jdbc.queryForObject("select count(*) from log_auditoria where acao = 'ESTABELECIMENTO_EDITADO'",
				Integer.class)).isZero();
	}

	// Cardápio público

	@Test
	void cardapioMostraSoAsFormasAceitas() throws Exception {
		aceitar(List.of("DEBITO", "DINHEIRO")).andExpect(status().isOk());

		mockMvc.perform(get(CARDAPIO))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.estabelecimento.formasPagamento", contains("DINHEIRO", "DEBITO")));
	}

	// Pedido pelo portal

	@Test
	void pedidoDoPortalGravaAFormaEscolhida() throws Exception {
		Map<String, Object> corpo = doPortal();
		corpo.put("formaPagamento", "DEBITO");

		enviar(corpo).andExpect(status().isCreated()).andExpect(jsonPath("$.numero").value(3));

		comToken(get("/api/pedidos/3"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.formaPagamento").value("DEBITO"));
		assertThat(jdbc.queryForObject("select detalhes ->> 'formaPagamento' from log_auditoria "
				+ "where acao = 'PEDIDO_CRIADO'", String.class)).isEqualTo("DEBITO");
	}

	@Test
	void pedidoDoPortalSemFormaOuComFormaQueALojaNaoAceitaERecusado() throws Exception {
		aceitar(List.of("PIX")).andExpect(status().isOk());

		Map<String, Object> semForma = doPortal();
		semForma.remove("formaPagamento");
		enviar(semForma)
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.campos.formaPagamento").value("Escolha a forma de pagamento."));

		for (String forma : List.of("DINHEIRO", "CHEQUE", "pix")) {
			Map<String, Object> corpo = doPortal();
			corpo.put("formaPagamento", forma);
			enviar(corpo)
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.campos.formaPagamento").value("Escolha uma forma de pagamento que a loja aceita."));
		}
		assertThat(jdbc.queryForObject("select count(*) from pedido where estabelecimento_id = ?", Integer.class,
				casaBelt)).isEqualTo(2);
	}

	@Test
	void formaRecusadaVemJuntoComOsOutrosErros() throws Exception {
		Map<String, Object> corpo = doPortal();
		corpo.put("formaPagamento", "CHEQUE");
		corpo.put("dataRetirada", hoje().plusDays(8).atTime(21, 0).toString());

		enviar(corpo)
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.campos.formaPagamento").value("Escolha uma forma de pagamento que a loja aceita."))
			.andExpect(jsonPath("$.campos.dataRetirada").value("Escolha um horário entre 8h e 20h, de 30 em 30 minutos."));
	}

	// Pedido pelo painel

	@Test
	void pedidoDoPainelTambemExigeUmaFormaAceita() throws Exception {
		aceitar(List.of("PIX", "CREDITO")).andExpect(status().isOk());

		Map<String, Object> corpo = doPainel(CARLA, hoje().plusDays(1).atTime(12, 0));
		corpo.put("formaPagamento", "VR");
		comToken(post("/api/pedidos"), corpo)
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.campos.formaPagamento").value("Escolha uma forma de pagamento que a loja aceita."));

		corpo.put("formaPagamento", "CREDITO");
		comToken(post("/api/pedidos"), corpo)
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.formaPagamento").value("CREDITO"));
	}

	@Test
	void pedidoAntigoVemSemFormaEPrecisaDeUmaNaEdicao() throws Exception {
		comToken(get("/api/pedidos/1"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.formaPagamento").value(nullValue()));

		Map<String, Object> semForma = doPainel(ANA, retirada1);
		semForma.remove("formaPagamento");
		comToken(put("/api/pedidos/1"), semForma)
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.campos.formaPagamento").value("Escolha a forma de pagamento."));

		Map<String, Object> comForma = doPainel(ANA, retirada1);
		comForma.put("formaPagamento", "DINHEIRO");
		comToken(put("/api/pedidos/1"), comForma)
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.formaPagamento").value("DINHEIRO"));

		assertThat(jdbc.queryForMap("""
				select detalhes -> 'antes' ->> 'formaPagamento' as antes,
				       detalhes -> 'depois' ->> 'formaPagamento' as depois
				from log_auditoria where acao = 'PEDIDO_EDITADO' and entidade_id = ?
				""", pedido1)).containsEntry("antes", null).containsEntry("depois", "DINHEIRO");
	}

	@Test
	void naEdicaoAFormaQueJaEstavaPodeFicarMesmoSemALojaAceitarMais() throws Exception {
		jdbc.update("update pedido set forma_pagamento = 'VR' where id = ?", pedido1);
		aceitar(List.of("PIX")).andExpect(status().isOk());

		Map<String, Object> mesmaForma = doPainel(ANA, retirada1);
		mesmaForma.put("formaPagamento", "VR");
		mesmaForma.put("observacao", "Mudou só a observação.");
		comToken(put("/api/pedidos/1"), mesmaForma)
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.formaPagamento").value("VR"));

		// Trocar por outra forma que a loja não aceita continua recusado
		Map<String, Object> outraForma = doPainel(ANA, retirada1);
		outraForma.put("formaPagamento", "DINHEIRO");
		comToken(put("/api/pedidos/1"), outraForma)
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.campos.formaPagamento").value("Escolha uma forma de pagamento que a loja aceita."));
	}

	// Mensagem de confirmação

	@Test
	void confirmacaoDizAFormaEscolhidaEAEdicaoAtualizaATexto() throws Exception {
		jdbc.update("update pedido set forma_pagamento = 'DEBITO' where id = ?", pedido1);

		comToken(post("/api/pedidos/1/confirmar"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.mensagens[0].texto",
					containsString("O pagamento é feito na retirada, por cartão de débito. Qualquer dúvida")));

		Map<String, Object> emDinheiro = doPainel(ANA, retirada1);
		emDinheiro.put("formaPagamento", "DINHEIRO");
		comToken(put("/api/pedidos/1"), emDinheiro)
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.mensagens[0].texto",
					containsString("O pagamento é feito na retirada, em dinheiro. Qualquer dúvida")));
	}

	@Test
	void confirmacaoDoPedidoAntigoSemFormaMantemAFraseDeAntes() throws Exception {
		comToken(post("/api/pedidos/1/confirmar"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.mensagens[0].texto",
					containsString("O pagamento é feito na retirada. Qualquer dúvida")));
	}

	/** Pedido do portal com retirada a 8 dias (RN22) e Pix, aceito por padrão. */
	private Map<String, Object> doPortal() {
		return doPainel(CARLA, hoje().plusDays(8).atTime(12, 0));
	}

	private Map<String, Object> doPainel(String telefone, LocalDateTime retirada) {
		String nome = ANA.equals(telefone) ? "Ana Exemplo" : "Carla Nova";
		Map<String, Object> corpo = pedido(nome, telefone, retirada, List.of(item(brigadeiro, 1, Map.of())));
		corpo.put("formaPagamento", "PIX");
		return corpo;
	}

	private ResultActions aceitar(List<String> formas) throws Exception {
		Map<String, Object> dados = dadosDaLoja();
		dados.put("formasPagamento", formas);
		return comToken(put(ESTABELECIMENTO), dados);
	}

	/** Os dados da Casa Belt como estão, com o mesmo link, para o cardápio continuar em casa-belt. */
	private Map<String, Object> dadosDaLoja() {
		Map<String, Object> dados = new LinkedHashMap<>();
		dados.put("nome", "Casa Belt");
		dados.put("slug", "casa-belt");
		dados.put("whatsapp", "5511900000000");
		return dados;
	}

	private ResultActions enviar(Map<String, Object> corpo) throws Exception {
		return mockMvc.perform(post(CARDAPIO + "/pedidos").contentType(MediaType.APPLICATION_JSON)
			.content(json.writeValueAsString(corpo)));
	}

	private ResultActions comToken(MockHttpServletRequestBuilder requisicao) throws Exception {
		return mockMvc.perform(requisicao.header(HttpHeaders.AUTHORIZATION, "Bearer " + token));
	}

	private ResultActions comToken(MockHttpServletRequestBuilder requisicao, Map<String, ?> corpo) throws Exception {
		return mockMvc.perform(requisicao.header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
			.header(HttpHeaders.USER_AGENT, CadastroPedidoTests.NAVEGADOR)
			.contentType(MediaType.APPLICATION_JSON)
			.content(json.writeValueAsString(corpo)));
	}

}
