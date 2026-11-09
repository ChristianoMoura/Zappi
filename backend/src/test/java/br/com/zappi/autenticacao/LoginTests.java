package br.com.zappi.autenticacao;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import br.com.zappi.TestcontainersConfiguration;
import tools.jackson.databind.json.JsonMapper;

/**
 * Login com e-mail e senha (ZAP-31) e o log de cada tentativa (ZAP-33). A senha da Lídia
 * nos testes é aleatória ({@link TestcontainersConfiguration#SENHA_DA_LIDIA}).
 *
 * Os testes gravam de verdade, como em produção: o {@code LOGIN_FALHA} fica numa
 * transação própria e não seria desfeito no fim do teste. Por isso a limpeza é explícita.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class LoginTests {

	private static final String ROTA = "/api/autenticacao/login";

	private static final String EMAIL_DA_LIDIA = "lidia@casabelt.com";

	private static final String EMAIL_DESATIVADA = "desativada@casabelt.com";

	private static final String NAVEGADOR = "Navegador de teste";

	private static final String RESPOSTA_GENERICA = """
			{"codigo":"CREDENCIAIS_INVALIDAS","mensagem":"E-mail ou senha incorretos."}""";

	private final JsonMapper json = JsonMapper.builder().build();

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private JwtDecoder decodificador;

	@Autowired
	private JdbcTemplate jdbc;

	@Autowired
	private PasswordEncoder codificadorDeSenha;

	@AfterEach
	void limpa() {
		jdbc.update("delete from log_auditoria where acao in ('LOGIN_SUCESSO', 'LOGIN_FALHA')");
		jdbc.update("delete from usuario where email = ?", EMAIL_DESATIVADA);
		jdbc.update("update usuario set ultimo_login_em = null where email = ?", EMAIL_DA_LIDIA);
	}

	@Test
	void entraComEmailESenhaCertos() throws Exception {
		String corpo = entrar(EMAIL_DA_LIDIA, TestcontainersConfiguration.SENHA_DA_LIDIA)
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.nome").value("Lídia"))
			.andReturn().getResponse().getContentAsString();

		Map<String, Object> lidia = lidia();
		Jwt token = decodificador.decode((String) json.readValue(corpo, Map.class).get("token"));
		assertThat(token.getSubject()).isEqualTo(lidia.get("id").toString());
		assertThat(((Number) token.getClaim("estabelecimento_id")).longValue())
			.isEqualTo(((Number) lidia.get("estabelecimento_id")).longValue());
	}

	@Test
	void registraOUltimoLogin() throws Exception {
		OffsetDateTime antes = OffsetDateTime.now().minusSeconds(1);

		entrar(EMAIL_DA_LIDIA, TestcontainersConfiguration.SENHA_DA_LIDIA).andExpect(status().isOk());

		OffsetDateTime ultimoLogin = jdbc.queryForObject(
				"select ultimo_login_em from usuario where email = ?", OffsetDateTime.class, EMAIL_DA_LIDIA);
		assertThat(ultimoLogin).isAfter(antes);
	}

	@Test
	void registraOLoginComSucessoNoLog() throws Exception {
		entrar("  Lidia@CasaBelt.com ", TestcontainersConfiguration.SENHA_DA_LIDIA).andExpect(status().isOk());

		Map<String, Object> lidia = lidia();
		assertThat(logsDeLogin()).singleElement().satisfies(log -> {
			assertThat(log).containsEntry("acao", "LOGIN_SUCESSO")
				.containsEntry("usuario_id", lidia.get("id"))
				.containsEntry("estabelecimento_id", lidia.get("estabelecimento_id"))
				// Gravado normalizado, para a contagem do bloqueio (ZAP-85) não se perder
				.containsEntry("email_informado", EMAIL_DA_LIDIA)
				.containsEntry("ip_origem", "127.0.0.1")
				.containsEntry("user_agent", NAVEGADOR);
			assertThat(log.get("criado_em")).isNotNull();
		});
	}

	@Test
	void recusaSenhaErradaComMensagemGenericaERegistraAFalha() throws Exception {
		entrar(EMAIL_DA_LIDIA, "Errada@123")
			.andExpect(status().isUnauthorized())
			.andExpect(content().json(RESPOSTA_GENERICA, true));

		Map<String, Object> lidia = lidia();
		assertThat(logsDeLogin()).singleElement().satisfies(log -> assertThat(log)
			.containsEntry("acao", "LOGIN_FALHA")
			.containsEntry("usuario_id", lidia.get("id"))
			.containsEntry("estabelecimento_id", lidia.get("estabelecimento_id"))
			.containsEntry("email_informado", EMAIL_DA_LIDIA)
			.containsEntry("motivo", "SENHA_INCORRETA")
			.containsEntry("ip_origem", "127.0.0.1")
			.containsEntry("user_agent", NAVEGADOR)
			.extractingByKey("criado_em").isNotNull());
	}

	@Test
	void recusaEmailInexistenteComAMesmaMensagemERegistraSemUsuario() throws Exception {
		entrar("ninguem@casabelt.com", TestcontainersConfiguration.SENHA_DA_LIDIA)
			.andExpect(status().isUnauthorized())
			.andExpect(content().json(RESPOSTA_GENERICA, true));

		assertThat(logsDeLogin()).singleElement().satisfies(log -> assertThat(log)
			.containsEntry("acao", "LOGIN_FALHA")
			.containsEntry("usuario_id", null)
			.containsEntry("estabelecimento_id", null)
			.containsEntry("email_informado", "ninguem@casabelt.com")
			.containsEntry("motivo", "EMAIL_INEXISTENTE")
			.containsEntry("ip_origem", "127.0.0.1")
			.containsEntry("user_agent", NAVEGADOR)
			.extractingByKey("criado_em").isNotNull());
	}

	@Test
	void recusaUsuariaDesativadaComAMesmaMensagemERegistraAFalha() throws Exception {
		jdbc.update("""
				insert into usuario (estabelecimento_id, nome, email, senha_hash, ativo)
				select id, 'Desativada', ?, ?, false
				from estabelecimento where slug = 'casa-belt'
				""", EMAIL_DESATIVADA, codificadorDeSenha.encode("Senha@123"));

		entrar(EMAIL_DESATIVADA, "Senha@123")
			.andExpect(status().isUnauthorized())
			.andExpect(content().json(RESPOSTA_GENERICA, true));

		assertThat(logsDeLogin()).singleElement()
			.satisfies(log -> assertThat(log).containsEntry("motivo", "USUARIO_INATIVO"));
	}

	@Test
	void nuncaGravaASenhaNoLog() throws Exception {
		entrar(EMAIL_DA_LIDIA, "Errada@123");
		entrar(EMAIL_DA_LIDIA, TestcontainersConfiguration.SENHA_DA_LIDIA);

		String tudo = jdbc.queryForList("select row_to_json(l)::text from log_auditoria l", String.class)
			.toString();
		assertThat(tudo).doesNotContain("Errada@123").doesNotContain(TestcontainersConfiguration.SENHA_DA_LIDIA);
	}

	@Test
	void recusaSenhaMaiorQueOLimiteDoBcrypt() throws Exception {
		entrar(EMAIL_DA_LIDIA, "a".repeat(100)).andExpect(status().isUnauthorized());
	}

	@Test
	void recusaCamposVaziosSemRegistrarTentativa() throws Exception {
		entrar("", "")
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.codigo").value("DADOS_INVALIDOS"));

		assertThat(logsDeLogin()).isEmpty();
	}

	@Test
	void recusaEmailMalFormado() throws Exception {
		entrar("lidia", TestcontainersConfiguration.SENHA_DA_LIDIA).andExpect(status().isBadRequest());
	}

	@Test
	void recusaCorpoInvalido() throws Exception {
		mockMvc.perform(post(ROTA).contentType(MediaType.APPLICATION_JSON).content("{"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.codigo").value("DADOS_INVALIDOS"));
	}

	private ResultActions entrar(String email, String senha) throws Exception {
		return mockMvc.perform(post(ROTA).contentType(MediaType.APPLICATION_JSON)
			.header(HttpHeaders.USER_AGENT, NAVEGADOR)
			.content(json.writeValueAsString(Map.of("email", email, "senha", senha))));
	}

	private Map<String, Object> lidia() {
		return jdbc.queryForMap("select id, estabelecimento_id from usuario where email = ?", EMAIL_DA_LIDIA);
	}

	private List<Map<String, Object>> logsDeLogin() {
		return jdbc.queryForList("""
				select acao, usuario_id, estabelecimento_id, email_informado, ip_origem, user_agent,
				       detalhes ->> 'motivo' as motivo, criado_em
				from log_auditoria where acao in ('LOGIN_SUCESSO', 'LOGIN_FALHA') order by id
				""");
	}

}
