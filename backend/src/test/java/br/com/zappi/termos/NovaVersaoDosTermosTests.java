package br.com.zappi.termos;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

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
 * Quando os textos mudam (RN26): com a versão 2 vigente, quem só aceitou a versão 1 volta a ser
 * pendente, e o aceite da versão 1 não vale. O aceite antigo continua gravado, como histórico.
 */
@SpringBootTest(properties = "zappi.termos.versao=2")
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class NovaVersaoDosTermosTests {

	private static final String EMAIL_DA_LIDIA = "lidia@casabelt.com";

	private final JsonMapper json = JsonMapper.builder().build();

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private JdbcTemplate jdbc;

	@Autowired
	private ServicoToken servicoToken;

	@BeforeEach
	void aceitouAVersaoUmHaUmTempo() {
		jdbc.update("""
				insert into aceite_termos (usuario_id, versao, aceito_em)
				select id, 1, now() - interval '30 days' from usuario where email = ?
				""", EMAIL_DA_LIDIA);
	}

	@AfterEach
	void limpa() {
		jdbc.update("delete from aceite_termos");
		jdbc.update("delete from log_auditoria where acao in ('LOGIN_SUCESSO', 'LOGIN_FALHA', 'TERMOS_ACEITOS')");
		jdbc.update("update usuario set ultimo_login_em = null where email = ?", EMAIL_DA_LIDIA);
	}

	@Test
	void aRotaPublicaMostraANovaVersao() throws Exception {
		mockMvc.perform(get("/api/publico/termos"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.versao").value(2));
	}

	@Test
	void quemSoAceitouAVersaoAntigaVoltaAPedirOsTermos() throws Exception {
		entrar(Map.of("email", EMAIL_DA_LIDIA, "senha", TestcontainersConfiguration.SENHA_DA_LIDIA))
			.andExpect(status().isForbidden())
			.andExpect(jsonPath("$.codigo").value("TERMOS_PENDENTES"));
	}

	@Test
	void oAceiteDaVersaoAntigaNaoValeParaANova() throws Exception {
		entrar(Map.of("email", EMAIL_DA_LIDIA, "senha", TestcontainersConfiguration.SENHA_DA_LIDIA, "aceiteTermos",
				true, "versaoTermos", 1))
			.andExpect(status().isForbidden())
			.andExpect(jsonPath("$.codigo").value("TERMOS_PENDENTES"));

		assertThat(jdbc.queryForObject("select count(*) from aceite_termos", Integer.class)).isEqualTo(1);
	}

	@Test
	void aceitarANovaVersaoLiberaOLoginEMantemOHistorico() throws Exception {
		entrar(Map.of("email", EMAIL_DA_LIDIA, "senha", TestcontainersConfiguration.SENHA_DA_LIDIA, "aceiteTermos",
				true, "versaoTermos", 2))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.termosAceitos.versao").value(2));

		assertThat(jdbc.queryForList("select versao from aceite_termos order by id", Integer.class))
			.containsExactly(1, 2);
	}

	@Test
	void aVersaoAceitaMostraOUltimoAceiteMesmoSendoDeUmaVersaoAntiga() throws Exception {
		Map<String, Object> lidia = jdbc.queryForMap("select id, estabelecimento_id from usuario where email = ?",
				EMAIL_DA_LIDIA);
		String token = servicoToken.gerar(new UsuarioAutenticado(((Number) lidia.get("id")).longValue(),
				((Number) lidia.get("estabelecimento_id")).longValue()));

		mockMvc.perform(get("/api/autenticacao/termos-aceitos").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.versao").value(1));
	}

	private ResultActions entrar(Map<String, Object> requisicao) throws Exception {
		return mockMvc.perform(post("/api/autenticacao/login").contentType(MediaType.APPLICATION_JSON)
			.content(json.writeValueAsString(requisicao)));
	}

}
