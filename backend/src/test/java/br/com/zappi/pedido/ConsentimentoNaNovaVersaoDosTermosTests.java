package br.com.zappi.pedido;

import static br.com.zappi.pedido.CadastroPedidoTests.hoje;
import static br.com.zappi.pedido.CadastroPedidoTests.item;
import static br.com.zappi.pedido.CadastroPedidoTests.pedido;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

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
import org.springframework.transaction.annotation.Transactional;

import br.com.zappi.TestcontainersConfiguration;
import br.com.zappi.seguranca.ServicoToken;
import br.com.zappi.seguranca.UsuarioAutenticado;
import tools.jackson.databind.json.JsonMapper;

/**
 * Versão dos termos no consentimento do cliente quando os textos mudam (ZAP-149, RN16, RN26):
 * com a versão 2 vigente, o cliente novo fica gravado com a 2, tanto pelo Portal do Cliente quanto
 * pelo cadastro da Lídia no painel. Com a versão 1, isso já é testado no {@code PedidoPeloPortalTests}
 * e no {@code CadastroPedidoTests}. Tudo é desfeito no fim de cada teste.
 */
@SpringBootTest(properties = "zappi.termos.versao=2")
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@Transactional
class ConsentimentoNaNovaVersaoDosTermosTests {

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

	@BeforeEach
	void prepara() {
		casaBelt = jdbc.queryForObject("select id from estabelecimento where slug = 'casa-belt'", Long.class);
		brigadeiro = jdbc.queryForObject("select id from produto where estabelecimento_id = ? and nome = ?",
				Long.class, casaBelt, "Bolo de brigadeiro de chocolate");
	}

	@Test
	void clienteNovoPeloPortalFicaComAVersaoNova() throws Exception {
		mockMvc.perform(post("/api/cardapio/casa-belt/pedidos").contentType(MediaType.APPLICATION_JSON)
			.content(json.writeValueAsString(pedido("Carla", CARLA, hoje().plusDays(7),
					List.of(item(brigadeiro, 1, Map.of()))))))
			.andExpect(status().isCreated());

		assertThat(versaoDoConsentimento(CARLA)).isEqualTo(2);
	}

	@Test
	void clienteNovoCadastradoPelaLidiaFicaComAVersaoNova() throws Exception {
		mockMvc.perform(post("/api/pedidos").header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenDaLidia())
			.contentType(MediaType.APPLICATION_JSON)
			.content(json.writeValueAsString(pedido("Carla", CARLA, hoje().plusDays(1),
					List.of(item(brigadeiro, 1, Map.of()))))))
			.andExpect(status().isCreated());

		assertThat(versaoDoConsentimento(CARLA)).isEqualTo(2);
	}

	private Integer versaoDoConsentimento(String telefone) {
		return jdbc.queryForObject(
				"select consentimento_versao from cliente where estabelecimento_id = ? and telefone_whatsapp = ?",
				Integer.class, casaBelt, telefone);
	}

	private String tokenDaLidia() {
		long lidia = jdbc.queryForObject("select id from usuario where email = 'lidia@casabelt.com'", Long.class);
		return servicoToken.gerar(new UsuarioAutenticado(lidia, casaBelt));
	}

}
