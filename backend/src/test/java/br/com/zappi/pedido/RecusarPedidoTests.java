package br.com.zappi.pedido;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDateTime;
import java.time.format.TextStyle;
import java.util.Locale;
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
 * Recusar e cancelar pedido (ZAP-53) com os pedidos Novos da V2: #1 (Ana) e #2 (Bruno).
 * Tudo é desfeito no fim de cada teste.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@Transactional
class RecusarPedidoTests {

	private static final String MOTIVO = "Agenda cheia nesse dia. Posso fazer para o dia seguinte.";

	private final JsonMapper json = JsonMapper.builder().build();

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private JdbcTemplate jdbc;

	@Autowired
	private ServicoToken servicoToken;

	private long casaBelt;

	private long lidia;

	private String token;

	@BeforeEach
	void prepara() {
		Map<String, Object> dados = jdbc.queryForMap(
				"select id, estabelecimento_id from usuario where email = 'lidia@casabelt.com'");
		lidia = ((Number) dados.get("id")).longValue();
		casaBelt = ((Number) dados.get("estabelecimento_id")).longValue();
		token = servicoToken.gerar(new UsuarioAutenticado(lidia, casaBelt));
	}

	@Test
	void recusaPedidoNovoComAMensagemEOMotivo() throws Exception {
		String texto = """
				Olá, Ana.

				Infelizmente não vamos conseguir atender o seu pedido #1 para %s.

				Motivo: %s

				Se quiser combinar outra data ou outro pedido, é só responder esta mensagem.

				Casa Belt
				Mensagem gerada pelo Zappi""".formatted(dataEsperada(1), MOTIVO);

		recusar(1, "  " + MOTIVO + "  ")
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.status").value(5))
			.andExpect(jsonPath("$.motivoRecusa").value(MOTIVO))
			.andExpect(jsonPath("$.recusadoEm").isString())
			.andExpect(jsonPath("$.cancelado").value(false))
			.andExpect(jsonPath("$.mensagens.length()").value(1))
			.andExpect(jsonPath("$.mensagens[0].tipo").value("RECUSA"))
			.andExpect(jsonPath("$.mensagens[0].status").value("PENDENTE"))
			.andExpect(jsonPath("$.mensagens[0].texto").value(texto))
			.andExpect(jsonPath("$.mensagens[0].link", startsWith("https://wa.me/5511900000001?text=Ol%C3%A1%2C%20Ana.")));

		assertThat(jdbc.queryForMap("""
				select m.telefone_destino, m.conteudo from mensagem_whatsapp m join pedido p on p.id = m.pedido_id
				where p.estabelecimento_id = ? and p.numero = 1
				""", casaBelt)).containsEntry("telefone_destino", "5511900000001").containsEntry("conteudo", texto);
		assertThat(log(1)).containsEntry("usuario_id", lidia)
			.containsEntry("antes", "NOVO")
			.containsEntry("depois", "RECUSADO")
			.containsEntry("cancelamento", "false")
			.containsEntry("motivo", MOTIVO);
	}

	@Test
	void cancelaPedidoConfirmadoMantendoAConfirmacaoAntiga() throws Exception {
		mockMvc.perform(post("/api/pedidos/1/confirmar").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
			.andExpect(status().isOk());

		recusar(1, "Tive um imprevisto de saúde.")
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.status").value(5))
			.andExpect(jsonPath("$.cancelado").value(true))
			.andExpect(jsonPath("$.confirmadoEm").isString())
			.andExpect(jsonPath("$.mensagens[*].tipo", contains("CONFIRMACAO", "RECUSA")));

		assertThat(log(1)).containsEntry("antes", "CONFIRMADO").containsEntry("cancelamento", "true");
	}

	@Test
	void cancelaPedidoEmProducao() throws Exception {
		jdbc.update("update pedido set status = 3, confirmado_em = now(), producao_em = now() "
				+ "where estabelecimento_id = ? and numero = 2", casaBelt);

		recusar(2, "Faltou ingrediente.")
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.status").value(5))
			.andExpect(jsonPath("$.cancelado").value(true));

		assertThat(log(2)).containsEntry("antes", "EM_PRODUCAO");
	}

	@Test
	void exigeOMotivoComAte500Caracteres() throws Exception {
		recusar(1, "").andExpect(status().isBadRequest()).andExpect(jsonPath("$.campos.motivo").value("Escreva o motivo."));
		recusar(1, "   ").andExpect(status().isBadRequest());
		recusar(1, "a".repeat(501)).andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.campos.motivo").value("Use até 500 caracteres."));
		mockMvc.perform(post("/api/pedidos/1/recusar").header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
			.contentType(MediaType.APPLICATION_JSON).content("{}"))
			.andExpect(status().isBadRequest());

		recusar(1, "a".repeat(500)).andExpect(status().isOk());
	}

	@Test
	void naoRecusaNadaQuandoOMotivoEInvalido() throws Exception {
		recusar(1, "").andExpect(status().isBadRequest());

		assertThat(jdbc.queryForObject("select status from pedido where estabelecimento_id = ? and numero = 1",
				Integer.class, casaBelt)).isEqualTo(1);
		assertThat(jdbc.queryForObject("""
				select count(*) from mensagem_whatsapp m join pedido p on p.id = m.pedido_id
				where p.estabelecimento_id = ? and p.numero = 1
				""", Integer.class, casaBelt)).isZero();
	}

	@Test
	void naoRecusaPedidoConcluidoNemJaRecusado() throws Exception {
		jdbc.update("update pedido set status = 4, confirmado_em = now(), producao_em = now(), concluido_em = now() "
				+ "where estabelecimento_id = ? and numero = 2", casaBelt);
		recusar(2, MOTIVO)
			.andExpect(status().isConflict())
			.andExpect(jsonPath("$.codigo").value("TRANSICAO_NAO_PERMITIDA"))
			.andExpect(jsonPath("$.mensagem").value("Pedidos concluídos ou já recusados não podem ser recusados nem cancelados."));

		recusar(1, MOTIVO).andExpect(status().isOk());
		recusar(1, "Outro motivo.").andExpect(status().isConflict());
		assertThat(jdbc.queryForObject("select motivo_recusa from pedido where estabelecimento_id = ? and numero = 1",
				String.class, casaBelt)).isEqualTo(MOTIVO);
	}

	@Test
	void pedidoInexistenteOuDeOutroEstabelecimentoDa404() throws Exception {
		recusar(999, MOTIVO).andExpect(status().isNotFound());

		long outraLoja = jdbc.queryForObject("""
				insert into estabelecimento (nome, slug, telefone_whatsapp)
				values ('Doces da Ana', 'doces-da-ana-recusar', '5511900000009') returning id
				""", Long.class);
		long ana = jdbc.queryForObject("""
				insert into usuario (estabelecimento_id, nome, email, senha_hash)
				values (?, 'Ana', 'ana@docesdaana.com', 'hash-de-teste') returning id
				""", Long.class, outraLoja);
		mockMvc.perform(post("/api/pedidos/1/recusar")
			.header(HttpHeaders.AUTHORIZATION, "Bearer " + servicoToken.gerar(new UsuarioAutenticado(ana, outraLoja)))
			.contentType(MediaType.APPLICATION_JSON)
			.content(json.writeValueAsString(Map.of("motivo", MOTIVO))))
			.andExpect(status().isNotFound());
		assertThat(jdbc.queryForObject("select status from pedido where estabelecimento_id = ? and numero = 1",
				Integer.class, casaBelt)).isEqualTo(1);
	}

	@Test
	void exigeOToken() throws Exception {
		mockMvc.perform(post("/api/pedidos/1/recusar").contentType(MediaType.APPLICATION_JSON)
			.content(json.writeValueAsString(Map.of("motivo", MOTIVO))))
			.andExpect(status().isUnauthorized());
	}

	private ResultActions recusar(int numero, String motivo) throws Exception {
		return mockMvc.perform(post("/api/pedidos/" + numero + "/recusar")
			.header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
			.contentType(MediaType.APPLICATION_JSON)
			.content(json.writeValueAsString(Map.of("motivo", motivo))));
	}

	private Map<String, Object> log(int numero) {
		return jdbc.queryForMap("""
				select l.usuario_id, l.detalhes ->> 'statusAntes' as antes, l.detalhes ->> 'statusDepois' as depois,
				       l.detalhes ->> 'cancelamento' as cancelamento, l.detalhes ->> 'motivo' as motivo
				from log_auditoria l join pedido p on p.id = l.entidade_id
				where l.acao = 'PEDIDO_RECUSADO' and p.estabelecimento_id = ? and p.numero = ?
				""", casaBelt, numero);
	}

	private String dataEsperada(int numero) {
		LocalDateTime data = jdbc.queryForObject("select data_retirada from pedido where estabelecimento_id = ? and numero = ?",
				LocalDateTime.class, casaBelt, numero);
		return "%s, %02d/%02d, às %dh".formatted(data.getDayOfWeek().getDisplayName(TextStyle.FULL, Locale.forLanguageTag("pt-BR")),
				data.getDayOfMonth(), data.getMonthValue(), data.getHour());
	}

}
