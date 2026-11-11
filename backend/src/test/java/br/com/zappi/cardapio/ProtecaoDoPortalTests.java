package br.com.zappi.cardapio;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.AfterEach;
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

import br.com.zappi.TestcontainersConfiguration;
import br.com.zappi.seguranca.ServicoToken;
import br.com.zappi.seguranca.UsuarioAutenticado;
import tools.jackson.databind.json.JsonMapper;

/**
 * Proteção do envio de pedidos sem login (ZAP-112, ZAP-103): limite por IP e por WhatsApp,
 * campo invisível contra robôs, tamanho dos campos e CORS. O teste não usa transação própria,
 * para ver o que de fato fica gravado, e o fim de cada teste apaga o que foi criado.
 */
@SpringBootTest(properties = "zappi.cors.origens-permitidas=https://zappi.test")
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class ProtecaoDoPortalTests {

	private static final String ENVIO = "/api/cardapio/casa-belt/pedidos";

	private static final String LIMITE = "Você já enviou muitos pedidos. Tente mais tarde ou fale com a Lídia pelo WhatsApp.";

	private static final String IP = "203.0.113.10";

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private JdbcTemplate jdbc;

	@Autowired
	private JsonMapper json;

	@Autowired
	private ServicoToken servicoToken;

	private long brigadeiro;

	@BeforeEach
	void prepara() {
		brigadeiro = jdbc.queryForObject("select id from produto where sabor = 'Brigadeiro de chocolate'", Long.class);
	}

	@AfterEach
	void apaga() {
		jdbc.update("delete from pedido where numero > 2");
		jdbc.update("delete from cliente where telefone_whatsapp like '5511988880%'");
		jdbc.update("delete from log_auditoria where acao in ('PEDIDO_CRIADO', 'PEDIDO_PUBLICO_RECUSADO')");
	}

	@Test
	void recusaOSextoEnvioDoMesmoIpNaHora() throws Exception {
		for (int i = 1; i <= 5; i++) {
			enviar(telefone(i), IP).andExpect(status().isCreated());
		}

		enviar(telefone(6), IP)
			.andExpect(status().isTooManyRequests())
			.andExpect(jsonPath("$.codigo").value("LIMITE_DE_ENVIOS"))
			.andExpect(jsonPath("$.mensagem").value(LIMITE));

		assertThat(pedidosNovos()).isEqualTo(5);
		assertThat(jdbc.queryForObject("select count(*) from cliente where telefone_whatsapp = ?", Integer.class,
				telefone(6))).isZero();
		Map<String, Object> recusa = jdbc.queryForMap("""
				select ip_origem, usuario_id, detalhes ->> 'motivo' as motivo, detalhes::text as tudo
				from log_auditoria where acao = 'PEDIDO_PUBLICO_RECUSADO'
				""");
		assertThat(recusa).containsEntry("ip_origem", IP).containsEntry("motivo", "LIMITE_POR_IP")
			.containsEntry("usuario_id", null);
		assertThat((String) recusa.get("tudo")).doesNotContain(telefone(6));

		// Outro IP continua podendo enviar
		enviar(telefone(6), "203.0.113.20").andExpect(status().isCreated());
	}

	@Test
	void depoisDeUmaHoraOMesmoIpVoltaAEnviar() throws Exception {
		for (int i = 1; i <= 5; i++) {
			enviar(telefone(i), IP).andExpect(status().isCreated());
		}
		jdbc.update("update log_auditoria set criado_em = now() - interval '61 minutes' where acao = 'PEDIDO_CRIADO'");

		enviar(telefone(6), IP).andExpect(status().isCreated());
	}

	@Test
	void recusaOQuartoEnvioDoMesmoWhatsappEm24Horas() throws Exception {
		for (int i = 1; i <= 3; i++) {
			enviar(telefone(1), "203.0.113." + i).andExpect(status().isCreated());
		}

		enviar(telefone(1), "203.0.113.4")
			.andExpect(status().isTooManyRequests())
			.andExpect(jsonPath("$.mensagem").value(LIMITE));
		assertThat(pedidosNovos()).isEqualTo(3);
		assertThat(jdbc.queryForObject("select detalhes ->> 'motivo' from log_auditoria where acao = 'PEDIDO_PUBLICO_RECUSADO'",
				String.class)).isEqualTo("LIMITE_POR_TELEFONE");

		// Outro WhatsApp do mesmo IP continua podendo enviar
		enviar(telefone(2), "203.0.113.4").andExpect(status().isCreated());

		// Depois de 24 horas, o mesmo WhatsApp volta a enviar
		jdbc.update("update log_auditoria set criado_em = now() - interval '25 hours' where acao = 'PEDIDO_CRIADO'");
		enviar(telefone(1), "203.0.113.5").andExpect(status().isCreated());
	}

	@Test
	void pedidosDaLidiaPeloPainelNaoContamNoLimite() throws Exception {
		Map<String, Object> lidia = jdbc.queryForMap(
				"select id, estabelecimento_id from usuario where email = 'lidia@casabelt.com'");
		String token = servicoToken.gerar(new UsuarioAutenticado(((Number) lidia.get("id")).longValue(),
				((Number) lidia.get("estabelecimento_id")).longValue()));
		for (int i = 0; i < 3; i++) {
			mockMvc.perform(post("/api/pedidos").header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
				.with(requisicao -> {
					requisicao.setRemoteAddr(IP);
					return requisicao;
				})
				.contentType(MediaType.APPLICATION_JSON)
				.content(json.writeValueAsString(corpo(telefone(1)))))
				.andExpect(status().isCreated());
		}

		enviar(telefone(1), IP).andExpect(status().isCreated());
	}

	@Test
	void campoInvisivelPreenchidoDescartaOEnvioSemGravarNada() throws Exception {
		Map<String, Object> robo = corpo(telefone(1));
		robo.put("site", "https://spam.example");

		mockMvc.perform(post(ENVIO).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(robo)))
			.andExpect(status().isCreated())
			.andExpect(content().json("{\"numero\":null}"));

		assertThat(pedidosNovos()).isZero();
		assertThat(jdbc.queryForObject("select count(*) from cliente where telefone_whatsapp = ?", Integer.class,
				telefone(1))).isZero();
		assertThat(jdbc.queryForObject("select count(*) from log_auditoria where acao in ('PEDIDO_CRIADO', "
				+ "'PEDIDO_PUBLICO_RECUSADO')", Integer.class)).isZero();
	}

	@Test
	void campoInvisivelEmBrancoContaComoVazio() throws Exception {
		Map<String, Object> pessoa = corpo(telefone(1));
		pessoa.put("site", "   ");

		mockMvc.perform(post(ENVIO).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(pessoa)))
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.numero").value(3));
	}

	@Test
	void recusaCamposAcimaDoTamanho() throws Exception {
		Map<String, Object> grande = corpo(telefone(1));
		grande.put("cliente", Map.of("nome", "x".repeat(101), "telefone", telefone(1)));
		grande.put("observacao", "x".repeat(501));
		grande.put("site", "x".repeat(201));

		mockMvc.perform(post(ENVIO).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(grande)))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.campos['cliente.nome']").value("Use no máximo 100 caracteres."))
			.andExpect(jsonPath("$.campos.observacao").value("Use no máximo 500 caracteres."))
			.andExpect(jsonPath("$.campos.site").value("Use no máximo 200 caracteres."));
		assertThat(pedidosNovos()).isZero();
	}

	@Test
	void soOEnderecoDoFrontendPodeChamarAsRotasPublicas() throws Exception {
		mockMvc.perform(options(ENVIO)
				.header(HttpHeaders.ORIGIN, "https://zappi.test")
				.header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "POST"))
			.andExpect(status().isOk())
			.andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "https://zappi.test"));

		mockMvc.perform(options(ENVIO)
				.header(HttpHeaders.ORIGIN, "https://site-qualquer.example")
				.header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "POST"))
			.andExpect(status().isForbidden())
			.andExpect(header().doesNotExist(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN));
	}

	private ResultActions enviar(String telefone, String ip) throws Exception {
		return mockMvc.perform(post(ENVIO)
			.with(requisicao -> {
				requisicao.setRemoteAddr(ip);
				return requisicao;
			})
			.contentType(MediaType.APPLICATION_JSON)
			.content(json.writeValueAsString(corpo(telefone))));
	}

	/** Pedido com retirada a 8 dias, ao meio-dia: vale pelo portal (RN22) e pelo painel. */
	private Map<String, Object> corpo(String telefone) {
		Map<String, Object> pedido = new HashMap<>();
		pedido.put("cliente", Map.of("nome", "Cliente de Teste", "telefone", telefone));
		pedido.put("consentimentoLgpd", true);
		pedido.put("dataRetirada", LocalDate.now(ZoneId.of("America/Sao_Paulo")).plusDays(8).atTime(12, 0).toString());
		pedido.put("itens", List.of(Map.of("produtoId", brigadeiro, "quantidade", 1)));
		return pedido;
	}

	private static String telefone(int i) {
		return "5511988880%03d".formatted(i);
	}

	private int pedidosNovos() {
		return jdbc.queryForObject("select count(*) from pedido where numero > 2", Integer.class);
	}

}
