package br.com.zappi.notificacao;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;
import java.time.LocalDateTime;
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
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;

import br.com.zappi.TestcontainersConfiguration;
import br.com.zappi.seguranca.ServicoToken;
import br.com.zappi.seguranca.UsuarioAutenticado;
import jakarta.persistence.EntityManager;
import tools.jackson.databind.json.JsonMapper;

/**
 * Caixa de notificações do painel (ZAP-174, ZAP-172): aviso de novo pedido do portal, avisos de
 * retirada próxima sem repetir e as três rotas, só com os dados do próprio estabelecimento. A
 * matriz completa de testes fica na ZAP-176.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@Transactional
class NotificacoesTests {

	private static final ZoneId FUSO = ZoneId.of("America/Sao_Paulo");

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private JdbcTemplate jdbc;

	@Autowired
	private JsonMapper json;

	@Autowired
	private ServicoToken servicoToken;

	@Autowired
	private ServicoNotificacao servico;

	@Autowired
	private EntityManager entityManager;

	private long casaBelt;

	private long ana;

	private long produto;

	@BeforeEach
	void prepara() {
		casaBelt = jdbc.queryForObject("select id from estabelecimento where slug = 'casa-belt'", Long.class);
		ana = jdbc.queryForObject("select id from cliente where telefone_whatsapp = '5511900000001'", Long.class);
		produto = jdbc.queryForObject("""
				select id from produto where estabelecimento_id = ? and ativo and no_cardapio order by id limit 1
				""", Long.class, casaBelt);
	}

	@Test
	void pedidoDoPortalAvisaNoSinoSemDadoPessoal() throws Exception {
		LocalDateTime retirada = hoje().plusDays(7).atTime(15, 0);
		naoVistas().andExpect(jsonPath("$.quantidade").value(0));

		mockMvc
			.perform(post("/api/cardapio/casa-belt/pedidos").contentType(MediaType.APPLICATION_JSON)
				.content(json.writeValueAsString(pedido("Carla Nova", "5511988887777", retirada))))
			.andExpect(status().isCreated());

		naoVistas().andExpect(jsonPath("$.quantidade").value(1));
		comToken(get("/api/notificacoes")).andExpect(status().isOk())
			.andExpect(jsonPath("$", hasSize(1)))
			.andExpect(jsonPath("$[0].tipo").value(1))
			.andExpect(jsonPath("$[0].momento").doesNotExist())
			.andExpect(jsonPath("$[0].numeroPedido").value(3))
			// Mesmo formato dos pedidos, que a tela do sino espera (ZAP-175)
			.andExpect(jsonPath("$[0].dataRetirada").value(retirada + ":00"))
			.andExpect(jsonPath("$[0].criadoEm").exists())
			.andExpect(jsonPath("$[0].vista").value(false))
			.andExpect(jsonPath("$[0].texto").value("Novo pedido #3. Retirada: %s, 15h".formatted(diaCurto(retirada))));
	}

	@Test
	void pedidoCadastradoPelaLidiaNaoAvisa() throws Exception {
		comToken(post("/api/pedidos").contentType(MediaType.APPLICATION_JSON)
			.content(json.writeValueAsString(pedido("Carla Nova", "5511988887777", hoje().plusDays(2).atTime(15, 0)))))
			.andExpect(status().isCreated());

		assertThat(jdbc.queryForObject("select count(*) from notificacao", Integer.class)).isZero();
	}

	@Test
	void avisaRetiradaProximaUmaVezSoPorMomento() throws Exception {
		LocalDate amanha = hoje().plusDays(1);
		long confirmado = pedidoGravado(10, 2, amanha.atTime(15, 0));
		long novo = pedidoGravado(11, 1, amanha.atTime(15, 30));

		// Amanhã às 13h: dia da retirada e 2 horas antes do confirmado; o novo só ganha o do dia
		for (int vez = 0; vez < 3; vez++) {
			servico.gerarRetiradasProximas(casaBelt, amanha.atTime(13, 0));
		}

		assertThat(momentos(confirmado)).containsExactlyInAnyOrder("NO_DIA", "DUAS_HORAS");
		assertThat(momentos(novo)).containsExactly("NO_DIA");
		// Lido hoje, o aviso do dia diz "amanhã"; o pedido Novo diz que ainda não foi confirmado
		comToken(get("/api/notificacoes")).andExpect(jsonPath("$[*].texto",
				containsInAnyOrder("Pedido #10 é retirado amanhã às 15h",
						"Pedido #10 é retirado às 15h, daqui a 2 horas",
						"Pedido #11 ainda não foi confirmado e é retirado amanhã às 15h30")));
	}

	@Test
	void pedidoNovoAvisaNaVesperaEPerdeOAindaNaoConfirmadoAoConfirmar() throws Exception {
		LocalDate amanha = hoje().plusDays(1);
		long novo = pedidoGravado(10, 1, amanha.atTime(15, 0));

		servico.gerarRetiradasProximas(casaBelt, hoje().atTime(8, 0));
		assertThat(momentos(novo)).containsExactly("VESPERA");
		comToken(get("/api/notificacoes"))
			.andExpect(jsonPath("$[0].texto").value("Pedido #10 ainda não foi confirmado e é retirado amanhã às 15h"));

		// Confirmado depois do aviso: o texto usa o status atual
		jdbc.update("update pedido set status = 2, confirmado_em = now() where id = ?", novo);
		// Numa requisição real, o pedido é lido de novo; aqui a transação do teste guardou o antigo
		entityManager.clear();
		comToken(get("/api/notificacoes")).andExpect(jsonPath("$[0].texto").value("Pedido #10 é retirado amanhã às 15h"));
	}

	@Test
	void recusadoOuComRetiradaQueJaPassouNaoAvisa() {
		LocalDate amanha = hoje().plusDays(1);
		long recusado = pedidoGravado(10, 5, amanha.atTime(15, 0));
		long passou = pedidoGravado(11, 2, amanha.atTime(9, 0));

		servico.gerarRetiradasProximas(casaBelt, amanha.atTime(13, 0));

		assertThat(momentos(recusado)).isEmpty();
		assertThat(momentos(passou)).isEmpty();
	}

	@Test
	void abrirACaixinhaMarcaComoVistasEZeraOContador() throws Exception {
		long pedido = pedidoGravado(10, 1, hoje().plusDays(7).atTime(15, 0));
		long primeira = notificacaoNova(casaBelt, pedido);
		naoVistas().andExpect(jsonPath("$.quantidade").value(1));

		vistas(List.of(primeira)).andExpect(status().isNoContent());

		naoVistas().andExpect(jsonPath("$.quantidade").value(0));
		comToken(get("/api/notificacoes")).andExpect(jsonPath("$[0].vista").value(true));
		// Marcar de novo não muda a data da primeira vez
		Object vistaEm = jdbc.queryForObject("select vista_em from notificacao where id = ?", Object.class, primeira);
		vistas(List.of(primeira)).andExpect(status().isNoContent());
		assertThat(jdbc.queryForObject("select vista_em from notificacao where id = ?", Object.class, primeira))
			.isEqualTo(vistaEm);
	}

	@Test
	void mostraSoOsUltimos30DiasEMaisRecentesPrimeiro() throws Exception {
		long antiga = notificacaoNova(casaBelt, pedidoGravado(10, 1, hoje().plusDays(7).atTime(15, 0)));
		long recente = notificacaoNova(casaBelt, pedidoGravado(11, 1, hoje().plusDays(8).atTime(15, 0)));
		long foraDaCaixinha = notificacaoNova(casaBelt, pedidoGravado(12, 1, hoje().plusDays(9).atTime(15, 0)));
		jdbc.update("update notificacao set criado_em = now() - interval '2 days' where id = ?", antiga);
		jdbc.update("update notificacao set criado_em = now() - interval '31 days' where id = ?", foraDaCaixinha);

		comToken(get("/api/notificacoes")).andExpect(jsonPath("$[*].id", contains((int) recente, (int) antiga)));
		naoVistas().andExpect(jsonPath("$.quantidade").value(2));
	}

	@Test
	void naoMostraNemMarcaNotificacaoDeOutraLoja() throws Exception {
		long outraLoja = jdbc.queryForObject("""
				insert into estabelecimento (nome, slug, telefone_whatsapp) values ('Outra loja', 'outra-loja',
				'5511911112222') returning id
				""", Long.class);
		long cliente = jdbc.queryForObject("""
				insert into cliente (estabelecimento_id, nome, telefone_whatsapp, consentimento_lgpd, consentimento_em)
				values (?, 'Cliente de outra loja', '5511933334444', true, now()) returning id
				""", Long.class, outraLoja);
		long pedidoDeOutraLoja = jdbc.queryForObject("""
				insert into pedido (estabelecimento_id, cliente_id, numero, status, data_retirada, valor_total,
				nome_cliente)
				values (?, ?, 1, 1, ?, 100.00, (select nome from cliente where id = ?)) returning id
				""", Long.class, outraLoja, cliente, hoje().plusDays(7).atTime(15, 0), cliente);
		long daOutraLoja = notificacaoNova(outraLoja, pedidoDeOutraLoja);

		comToken(get("/api/notificacoes")).andExpect(jsonPath("$", hasSize(0)));
		naoVistas().andExpect(jsonPath("$.quantidade").value(0));
		vistas(List.of(daOutraLoja)).andExpect(status().isNoContent());
		assertThat(jdbc.queryForObject("select vista_em from notificacao where id = ?", Object.class, daOutraLoja))
			.isNull();
	}

	@Test
	void exigeLoginEIdsNaMarcacao() throws Exception {
		mockMvc.perform(get("/api/notificacoes")).andExpect(status().isUnauthorized());
		mockMvc.perform(get("/api/notificacoes/nao-vistas")).andExpect(status().isUnauthorized());
		mockMvc.perform(post("/api/notificacoes/vistas").contentType(MediaType.APPLICATION_JSON).content("{\"ids\":[]}"))
			.andExpect(status().isUnauthorized());

		comToken(post("/api/notificacoes/vistas").contentType(MediaType.APPLICATION_JSON).content("{}"))
			.andExpect(status().isBadRequest());
	}

	private ResultActions naoVistas() throws Exception {
		return comToken(get("/api/notificacoes/nao-vistas")).andExpect(status().isOk());
	}

	private ResultActions vistas(List<Long> ids) throws Exception {
		return comToken(post("/api/notificacoes/vistas").contentType(MediaType.APPLICATION_JSON)
			.content(json.writeValueAsString(Map.of("ids", ids))));
	}

	private ResultActions comToken(MockHttpServletRequestBuilder requisicao) throws Exception {
		return mockMvc.perform(requisicao.header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenDaLidia()));
	}

	/** Pedido gravado direto no banco, com o status e a retirada do teste. */
	private long pedidoGravado(int numero, int status, LocalDateTime retirada) {
		return jdbc.queryForObject("""
				insert into pedido (estabelecimento_id, cliente_id, numero, status, data_retirada, valor_total,
				motivo_recusa, nome_cliente)
				values (?, ?, ?, ?, ?, 100.00, ?, (select nome from cliente where id = ?)) returning id
				""", Long.class, casaBelt, ana, numero, status, retirada, status == 5 ? "Sem agenda" : null, ana);
	}

	private long notificacaoNova(long loja, long pedido) {
		return jdbc.queryForObject(
				"insert into notificacao (estabelecimento_id, pedido_id, tipo) values (?, ?, 1) returning id", Long.class,
				loja, pedido);
	}

	private List<String> momentos(long pedido) {
		return jdbc.queryForList("select momento from notificacao where pedido_id = ? and tipo = 2", String.class,
				pedido);
	}

	private Map<String, Object> pedido(String nome, String telefone, LocalDateTime retirada) {
		Map<String, Object> pedido = new HashMap<>();
		pedido.put("cliente", Map.of("nome", nome, "telefone", telefone));
		pedido.put("consentimentoLgpd", true);
		pedido.put("dataRetirada", retirada.toString());
		pedido.put("observacao", "");
		pedido.put("itens", List.of(Map.of("produtoId", produto, "quantidade", 1)));
		pedido.put("formaPagamento", "PIX");
		return pedido;
	}

	private String tokenDaLidia() {
		long lidia = jdbc.queryForObject("select id from usuario where email = 'lidia@casabelt.com'", Long.class);
		return servicoToken.gerar(new UsuarioAutenticado(lidia, casaBelt));
	}

	private static LocalDate hoje() {
		return LocalDate.now(FUSO);
	}

	/** "sáb, 22/11". */
	private static String diaCurto(LocalDateTime data) {
		String[] dias = { "seg", "ter", "qua", "qui", "sex", "sáb", "dom" };
		return "%s, %02d/%02d".formatted(dias[data.getDayOfWeek().getValue() - 1], data.getDayOfMonth(),
				data.getMonthValue());
	}

}
