package br.com.zappi.pedido;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
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
import tools.jackson.databind.json.JsonMapper;

/**
 * Marcar a mensagem como enviada (ZAP-50). Cada teste confirma o pedido #1 da V2, o que gera
 * a mensagem de confirmação Pendente.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@Transactional
class MensagemEnviadaTests {

	private final JsonMapper json = JsonMapper.builder().build();

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private JdbcTemplate jdbc;

	@Autowired
	private ServicoToken servicoToken;

	private String token;

	private long mensagem;

	@BeforeEach
	void confirmaOPedido() throws Exception {
		Map<String, Object> lidia = jdbc.queryForMap(
				"select id, estabelecimento_id from usuario where email = 'lidia@casabelt.com'");
		token = servicoToken.gerar(new UsuarioAutenticado(((Number) lidia.get("id")).longValue(),
				((Number) lidia.get("estabelecimento_id")).longValue()));

		String corpo = comToken(post("/api/pedidos/1/confirmar")).andExpect(status().isOk())
			.andExpect(jsonPath("$.mensagens[0].id").isNumber())
			.andReturn().getResponse().getContentAsString();
		mensagem = json.readTree(corpo).path("mensagens").path(0).path("id").asLong();
	}

	@Test
	void marcaComoEnviadaComAData() throws Exception {
		marcar(1, mensagem)
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.mensagens[0].status").value("ENVIADA"))
			.andExpect(jsonPath("$.mensagens[0].enviadoEm").isString());

		assertThat(jdbc.queryForObject("select status from mensagem_whatsapp where id = ?", Integer.class, mensagem))
			.isEqualTo(2);
	}

	@Test
	void reenviarNaoDaErroEMantemAPrimeiraData() throws Exception {
		marcar(1, mensagem).andExpect(status().isOk());
		jdbc.update("update mensagem_whatsapp set enviado_em = enviado_em - interval '1 hour' where id = ?", mensagem);
		Object primeiroEnvio = jdbc.queryForObject("select enviado_em from mensagem_whatsapp where id = ?", Object.class,
				mensagem);

		marcar(1, mensagem).andExpect(status().isOk()).andExpect(jsonPath("$.mensagens[0].status").value("ENVIADA"));

		assertThat(jdbc.queryForObject("select enviado_em from mensagem_whatsapp where id = ?", Object.class, mensagem))
			.isEqualTo(primeiroEnvio);
	}

	@Test
	void mensagemDeOutroPedidoOuInexistenteDa404() throws Exception {
		marcar(2, mensagem).andExpect(status().isNotFound())
			.andExpect(jsonPath("$.codigo").value("MENSAGEM_NAO_ENCONTRADA"));
		marcar(1, 999_999).andExpect(status().isNotFound());

		assertThat(jdbc.queryForObject("select status from mensagem_whatsapp where id = ?", Integer.class, mensagem))
			.isEqualTo(1);
	}

	@Test
	void mensagemDeOutroEstabelecimentoDa404() throws Exception {
		long outraLoja = jdbc.queryForObject("""
				insert into estabelecimento (nome, slug, telefone_whatsapp)
				values ('Doces da Ana', 'doces-da-ana-mensagem', '5511900000009') returning id
				""", Long.class);
		long ana = jdbc.queryForObject("""
				insert into usuario (estabelecimento_id, nome, email, senha_hash)
				values (?, 'Ana', 'ana@docesdaana.com', 'hash-de-teste') returning id
				""", Long.class, outraLoja);

		mockMvc.perform(post("/api/pedidos/1/mensagens/" + mensagem + "/enviada")
			.header(HttpHeaders.AUTHORIZATION, "Bearer " + servicoToken.gerar(new UsuarioAutenticado(ana, outraLoja))))
			.andExpect(status().isNotFound());
	}

	@Test
	void exigeOToken() throws Exception {
		mockMvc.perform(post("/api/pedidos/1/mensagens/" + mensagem + "/enviada")).andExpect(status().isUnauthorized());
	}

	private ResultActions marcar(int numero, long idMensagem) throws Exception {
		return comToken(post("/api/pedidos/" + numero + "/mensagens/" + idMensagem + "/enviada"));
	}

	private ResultActions comToken(org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder requisicao)
			throws Exception {
		return mockMvc.perform(requisicao.header(HttpHeaders.AUTHORIZATION, "Bearer " + token));
	}

}
