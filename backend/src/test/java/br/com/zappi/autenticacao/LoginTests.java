package br.com.zappi.autenticacao;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.OffsetDateTime;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import br.com.zappi.TestcontainersConfiguration;
import jakarta.persistence.EntityManager;
import tools.jackson.databind.json.JsonMapper;

/**
 * Login com e-mail e senha (ZAP-31). A senha da Lídia nos testes é aleatória
 * ({@link TestcontainersConfiguration#SENHA_DA_LIDIA}).
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@Transactional
class LoginTests {

	private static final String ROTA = "/api/autenticacao/login";

	private static final String EMAIL_DA_LIDIA = "lidia@casabelt.com";

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
	private EntityManager entityManager;

	@Autowired
	private PasswordEncoder codificadorDeSenha;

	@Test
	void entraComEmailESenhaCertos() throws Exception {
		String corpo = entrar(EMAIL_DA_LIDIA, TestcontainersConfiguration.SENHA_DA_LIDIA)
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.nome").value("Lídia"))
			.andReturn().getResponse().getContentAsString();

		Map<String, Object> lidia = jdbc.queryForMap(
				"select id, estabelecimento_id from usuario where email = ?", EMAIL_DA_LIDIA);
		Jwt token = decodificador.decode((String) json.readValue(corpo, Map.class).get("token"));
		assertThat(token.getSubject()).isEqualTo(lidia.get("id").toString());
		assertThat(((Number) token.getClaim("estabelecimento_id")).longValue())
			.isEqualTo(((Number) lidia.get("estabelecimento_id")).longValue());
	}

	@Test
	void registraOUltimoLogin() throws Exception {
		OffsetDateTime antes = OffsetDateTime.now().minusSeconds(1);

		entrar(EMAIL_DA_LIDIA, TestcontainersConfiguration.SENHA_DA_LIDIA).andExpect(status().isOk());
		entityManager.flush();

		OffsetDateTime ultimoLogin = jdbc.queryForObject(
				"select ultimo_login_em from usuario where email = ?", OffsetDateTime.class, EMAIL_DA_LIDIA);
		assertThat(ultimoLogin).isAfter(antes);
	}

	@Test
	void aceitaEmailComMaiusculasEEspacos() throws Exception {
		entrar("  Lidia@CasaBelt.com ", TestcontainersConfiguration.SENHA_DA_LIDIA).andExpect(status().isOk());
	}

	@Test
	void recusaSenhaErradaComMensagemGenerica() throws Exception {
		entrar(EMAIL_DA_LIDIA, "Errada@123")
			.andExpect(status().isUnauthorized())
			.andExpect(content().json(RESPOSTA_GENERICA, true));
	}

	@Test
	void recusaEmailInexistenteComAMesmaMensagem() throws Exception {
		entrar("ninguem@casabelt.com", TestcontainersConfiguration.SENHA_DA_LIDIA)
			.andExpect(status().isUnauthorized())
			.andExpect(content().json(RESPOSTA_GENERICA, true));
	}

	@Test
	void recusaUsuariaDesativadaComAMesmaMensagem() throws Exception {
		jdbc.update("""
				insert into usuario (estabelecimento_id, nome, email, senha_hash, ativo)
				select id, 'Desativada', 'desativada@casabelt.com', ?, false
				from estabelecimento where slug = 'casa-belt'
				""", codificadorDeSenha.encode("Senha@123"));

		entrar("desativada@casabelt.com", "Senha@123")
			.andExpect(status().isUnauthorized())
			.andExpect(content().json(RESPOSTA_GENERICA, true));
	}

	@Test
	void recusaSenhaMaiorQueOLimiteDoBcrypt() throws Exception {
		entrar(EMAIL_DA_LIDIA, "a".repeat(100)).andExpect(status().isUnauthorized());
	}

	@Test
	void recusaCamposVazios() throws Exception {
		entrar("", "")
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.codigo").value("DADOS_INVALIDOS"));
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
			.content(json.writeValueAsString(Map.of("email", email, "senha", senha))));
	}

}
