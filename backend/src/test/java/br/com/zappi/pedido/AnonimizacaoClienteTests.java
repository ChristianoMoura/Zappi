package br.com.zappi.pedido;

import static br.com.zappi.pedido.CadastroPedidoTests.hoje;
import static br.com.zappi.pedido.CadastroPedidoTests.item;
import static br.com.zappi.pedido.CadastroPedidoTests.pedido;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
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
 * Anonimização do cliente (ZAP-115, US12, RF24, RN17, LGPD), com a Ana Exemplo do pedido #1 da
 * V2. Tudo é desfeito no fim de cada teste.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@Transactional
class AnonimizacaoClienteTests {

	private static final String NOME_DA_ANA = "Ana Exemplo";

	private static final String TELEFONE_DA_ANA = "5511900000001";

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private JdbcTemplate jdbc;

	@Autowired
	private ServicoToken servicoToken;

	@Autowired
	private JsonMapper json;

	private long casaBelt;

	private long lidia;

	private String token;

	private long pedido;

	private long ana;

	@BeforeEach
	void prepara() {
		Map<String, Object> usuario = jdbc.queryForMap(
				"select id, estabelecimento_id from usuario where email = 'lidia@casabelt.com'");
		lidia = ((Number) usuario.get("id")).longValue();
		casaBelt = ((Number) usuario.get("estabelecimento_id")).longValue();
		token = servicoToken.gerar(new UsuarioAutenticado(lidia, casaBelt));
		pedido = jdbc.queryForObject("select id from pedido where estabelecimento_id = ? and numero = 1", Long.class,
				casaBelt);
		ana = jdbc.queryForObject("select cliente_id from pedido where id = ?", Long.class, pedido);
	}

	@Test
	void anonimizaOClienteSemApagarOHistorico() throws Exception {
		// Pedido percorrido pela API: gera a confirmação e o pronto, que cumprimentam a Ana pelo nome
		acao(1, "confirmar").andExpect(status().isOk());
		acao(1, "iniciar-producao").andExpect(status().isOk());
		acao(1, "concluir").andExpect(status().isOk());
		// Registro antigo com o nome e o telefone nos detalhes, em vários níveis
		jdbc.update("""
				insert into log_auditoria (estabelecimento_id, usuario_id, acao, entidade, entidade_id, detalhes)
				values (?, ?, 'PEDIDO_EDITADO', 'pedido', ?,
				  '{"cliente": {"nome": "ana exemplo", "telefone": "5511900000001"}, "itens": ["Bolo da Ana Exemplo"], "numero": 1}')
				""", casaBelt, lidia, pedido);
		Map<String, Object> antes = jdbc.queryForMap(
				"select valor_total, observacao, data_retirada, status from pedido where id = ?", pedido);

		anonimizar(1)
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.numero").value(1))
			.andExpect(jsonPath("$.status").value(4))
			.andExpect(jsonPath("$.cliente.nome").value("Cliente anonimizado"))
			.andExpect(jsonPath("$.cliente.telefone").value(nullValue()))
			.andExpect(jsonPath("$.cliente.anonimizado").value(true))
			.andExpect(jsonPath("$.mensagens.length()").value(2))
			.andExpect(jsonPath("$.mensagens[0].link").value(nullValue()))
			.andExpect(jsonPath("$.mensagens[0].texto").value(org.hamcrest.Matchers.startsWith(
					"Olá, Cliente anonimizado!")));

		String telefoneAnonimizado = "0%012d".formatted(ana);
		Map<String, Object> cliente = jdbc.queryForMap(
				"select nome, telefone_whatsapp, anonimizado_em, consentimento_lgpd from cliente where id = ?", ana);
		assertThat(cliente.get("nome")).isEqualTo("Cliente anonimizado");
		assertThat(cliente.get("telefone_whatsapp")).isEqualTo(telefoneAnonimizado);
		assertThat((String) cliente.get("telefone_whatsapp")).hasSize(13);
		assertThat(cliente.get("anonimizado_em")).isNotNull();

		// Nome e telefone originais não aparecem em nenhuma das três tabelas (critério de aceitação)
		assertThat(jdbc.queryForList("select telefone_destino from mensagem_whatsapp where pedido_id = ?",
				String.class, pedido)).containsOnly(telefoneAnonimizado);
		assertThat(jdbc.queryForObject("""
				select count(*) from mensagem_whatsapp where pedido_id = ? and (conteudo ~* '\\mana\\M' or conteudo like ?)
				""", Integer.class, pedido, "%" + TELEFONE_DA_ANA + "%")).isZero();
		assertThat(jdbc.queryForObject("""
				select count(*) from log_auditoria where estabelecimento_id = ?
				and (strpos(lower(detalhes::text), lower(?)) > 0 or strpos(detalhes::text, ?) > 0)
				""", Integer.class, casaBelt, NOME_DA_ANA, TELEFONE_DA_ANA)).isZero();
		assertThat(jdbc.queryForObject("""
				select detalhes::text from log_auditoria where acao = 'PEDIDO_EDITADO' and entidade_id = ?
				""", String.class, pedido)).contains("\"nome\": \"Cliente anonimizado\"")
			.contains("\"telefone\": \"" + telefoneAnonimizado + "\"")
			.contains("Bolo da Cliente anonimizado")
			.contains("\"numero\": 1");

		// Pedido, itens e valores continuam no histórico, com as observações como estavam
		assertThat(jdbc.queryForMap("select valor_total, observacao, data_retirada, status from pedido where id = ?",
				pedido)).isEqualTo(antes);
		assertThat(jdbc.queryForObject("select sum(subtotal) from item_pedido where pedido_id = ?", BigDecimal.class,
				pedido)).isEqualByComparingTo(((BigDecimal) antes.get("valor_total")));

		// A ação fica no log, sem os dados antigos
		Map<String, Object> registro = jdbc.queryForMap("""
				select usuario_id, entidade, entidade_id, detalhes::text as detalhes from log_auditoria
				where acao = 'CLIENTE_ANONIMIZADO'
				""");
		assertThat(registro.get("usuario_id")).isEqualTo(lidia);
		assertThat(registro.get("entidade")).isEqualTo("cliente");
		assertThat(registro.get("entidade_id")).isEqualTo(ana);
		assertThat((String) registro.get("detalhes")).contains("\"numeroPedido\": 1")
			.doesNotContainIgnoringCase("ana")
			.doesNotContain(TELEFONE_DA_ANA);
	}

	@Test
	void tiraONomeDoMotivoDaRecusaNaMensagem() throws Exception {
		acao(1, "recusar", Map.of("motivo", "A ana pediu para cancelar. Ligar para 5511900000001."))
			.andExpect(status().isOk());

		anonimizar(1).andExpect(status().isOk());

		assertThat(jdbc.queryForObject("select conteudo from mensagem_whatsapp where pedido_id = ?", String.class,
				pedido))
			.startsWith("Olá, Cliente anonimizado.")
			.contains("Motivo: A Cliente anonimizado pediu para cancelar. Ligar para 0%012d.".formatted(ana))
			.doesNotContainIgnoringCase("ana ")
			.doesNotContain(TELEFONE_DA_ANA);
		// O motivo do pedido, que deu origem à mensagem, também perde o nome e o telefone
		assertThat(jdbc.queryForObject("select motivo_recusa from pedido where id = ?", String.class, pedido))
			.isEqualTo("A Cliente anonimizado pediu para cancelar. Ligar para 0%012d.".formatted(ana));
	}

	@Test
	void motivoQueFicaMaiorQueAColunaECortado() throws Exception {
		String motivo = "Ana ".repeat(125);
		acao(1, "recusar", Map.of("motivo", motivo.strip())).andExpect(status().isOk());

		anonimizar(1).andExpect(status().isOk());

		String depois = jdbc.queryForObject("select motivo_recusa from pedido where id = ?", String.class, pedido);
		assertThat(depois).hasSize(500).startsWith("Cliente anonimizado Cliente anonimizado").doesNotContain("Ana");
	}

	@Test
	void observacoesDoPedidoEDoItemNaoMudam() throws Exception {
		jdbc.update("update pedido set observacao = 'Festa da Ana' where id = ?", pedido);
		jdbc.update("update item_pedido set observacao = 'Escrever Ana no bolo' where pedido_id = ?", pedido);
		concluirPedido1();

		anonimizar(1).andExpect(status().isOk());

		assertThat(jdbc.queryForObject("select observacao from pedido where id = ?", String.class, pedido))
			.isEqualTo("Festa da Ana");
		assertThat(jdbc.queryForList("select observacao from item_pedido where pedido_id = ?", String.class, pedido))
			.containsOnly("Escrever Ana no bolo");
	}

	@Test
	void pedidoDoClienteAnonimizadoNaoVoltaParaProducao() throws Exception {
		concluirPedido1();
		anonimizar(1).andExpect(status().isOk());

		acao(1, "voltar-para-producao").andExpect(status().isConflict())
			.andExpect(jsonPath("$.codigo").value("TRANSICAO_NAO_PERMITIDA"))
			.andExpect(jsonPath("$.mensagem")
				.value("Os dados deste cliente foram apagados. O pedido não pode voltar para a produção."));
		assertThat(jdbc.queryForObject("select status from pedido where id = ?", Integer.class, pedido)).isEqualTo(4);
	}

	@Test
	void bloqueiaComPedidoEmAberto() throws Exception {
		for (String etapa : List.of("status = 1", "status = 2, confirmado_em = now()",
				"status = 3, confirmado_em = now(), producao_em = now()")) {
			jdbc.update("update pedido set " + etapa + " where id = ?", pedido);

			anonimizar(1).andExpect(status().isConflict())
				.andExpect(jsonPath("$.codigo").value("CLIENTE_COM_PEDIDO_EM_ABERTO"))
				.andExpect(jsonPath("$.mensagem").value(org.hamcrest.Matchers.containsString("pedido em andamento")));
		}

		assertThat(jdbc.queryForMap("select nome, telefone_whatsapp, anonimizado_em from cliente where id = ?", ana))
			.containsEntry("nome", NOME_DA_ANA)
			.containsEntry("telefone_whatsapp", TELEFONE_DA_ANA)
			.containsEntry("anonimizado_em", null);
		assertThat(jdbc.queryForObject("select count(*) from log_auditoria where acao = 'CLIENTE_ANONIMIZADO'",
				Integer.class)).isZero();
	}

	@Test
	void bloqueiaPorOutroPedidoEmAbertoDoMesmoCliente() throws Exception {
		concluirPedido1();
		cadastrar(NOME_DA_ANA, TELEFONE_DA_ANA).andExpect(status().isCreated());

		anonimizar(1).andExpect(status().isConflict())
			.andExpect(jsonPath("$.codigo").value("CLIENTE_COM_PEDIDO_EM_ABERTO"));
	}

	@Test
	void novoPedidoComOMesmoTelefoneCriaUmClienteNovo() throws Exception {
		concluirPedido1();
		anonimizar(1).andExpect(status().isOk());

		cadastrar("Ana Nova", TELEFONE_DA_ANA).andExpect(status().isCreated())
			.andExpect(jsonPath("$.cliente.nome").value("Ana Nova"))
			.andExpect(jsonPath("$.cliente.telefone").value(TELEFONE_DA_ANA))
			.andExpect(jsonPath("$.cliente.anonimizado").value(false));

		long novo = jdbc.queryForObject(
				"select id from cliente where estabelecimento_id = ? and telefone_whatsapp = ?", Long.class, casaBelt,
				TELEFONE_DA_ANA);
		assertThat(novo).isNotEqualTo(ana);
		assertThat(jdbc.queryForObject("select consentimento_lgpd from cliente where id = ?", Boolean.class, novo))
			.isTrue();
		assertThat(jdbc.queryForObject("select nome from cliente where id = ?", String.class, ana))
			.isEqualTo("Cliente anonimizado");
	}

	@Test
	void naoAnonimizaDuasVezes() throws Exception {
		concluirPedido1();
		anonimizar(1).andExpect(status().isOk());

		anonimizar(1).andExpect(status().isConflict())
			.andExpect(jsonPath("$.codigo").value("CLIENTE_JA_ANONIMIZADO"));
		assertThat(jdbc.queryForObject("select count(*) from log_auditoria where acao = 'CLIENTE_ANONIMIZADO'",
				Integer.class)).isEqualTo(1);
	}

	@Test
	void pedidoInexistenteOuDeOutroEstabelecimentoDa404() throws Exception {
		anonimizar(999).andExpect(status().isNotFound());

		concluirPedido1();
		long outraLoja = jdbc.queryForObject("""
				insert into estabelecimento (nome, slug, telefone_whatsapp)
				values ('Doces da Ana', 'doces-da-ana-anonimizacao', '5511900000009') returning id
				""", Long.class);
		long dona = jdbc.queryForObject("""
				insert into usuario (estabelecimento_id, nome, email, senha_hash)
				values (?, 'Ana', 'ana@docesdaana.com', 'hash-de-teste') returning id
				""", Long.class, outraLoja);
		mockMvc.perform(post("/api/pedidos/1/anonimizar-cliente")
			.header(HttpHeaders.AUTHORIZATION, "Bearer " + servicoToken.gerar(new UsuarioAutenticado(dona, outraLoja))))
			.andExpect(status().isNotFound());
		assertThat(jdbc.queryForObject("select anonimizado_em from cliente where id = ?", Object.class, ana)).isNull();
	}

	@Test
	void exigeLogin() throws Exception {
		mockMvc.perform(post("/api/pedidos/1/anonimizar-cliente")).andExpect(status().isUnauthorized());
	}

	private void concluirPedido1() {
		jdbc.update("""
				update pedido set status = 4, confirmado_em = now(), producao_em = now(), concluido_em = now()
				where id = ?
				""", pedido);
	}

	private ResultActions anonimizar(int numero) throws Exception {
		return acao(numero, "anonimizar-cliente");
	}

	private ResultActions acao(int numero, String acao) throws Exception {
		return mockMvc.perform(post("/api/pedidos/" + numero + "/" + acao)
			.header(HttpHeaders.AUTHORIZATION, "Bearer " + token));
	}

	private ResultActions acao(int numero, String acao, Map<String, Object> corpo) throws Exception {
		return mockMvc.perform(post("/api/pedidos/" + numero + "/" + acao)
			.header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
			.contentType(MediaType.APPLICATION_JSON)
			.content(json.writeValueAsString(corpo)));
	}

	private ResultActions cadastrar(String nome, String telefone) throws Exception {
		long brigadeiro = jdbc.queryForObject(
				"select id from produto where estabelecimento_id = ? and sabor = 'Brigadeiro de chocolate'", Long.class,
				casaBelt);
		return mockMvc.perform(post("/api/pedidos").header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
			.contentType(MediaType.APPLICATION_JSON)
			.content(json.writeValueAsString(
					pedido(nome, telefone, hoje().plusDays(10), List.of(item(brigadeiro, 1, Map.of()))))));
	}

}
