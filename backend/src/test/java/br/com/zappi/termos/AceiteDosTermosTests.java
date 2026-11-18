package br.com.zappi.termos;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.HashMap;
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
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import br.com.zappi.TestcontainersConfiguration;
import br.com.zappi.seguranca.ServicoToken;
import br.com.zappi.seguranca.UsuarioAutenticado;
import tools.jackson.databind.json.JsonMapper;

/**
 * Aceite dos Termos de uso e da Política de privacidade no login (ZAP-146, RN27, LGPD, ISO 27002
 * 5.34 e 8.16) e as rotas da versão vigente e da versão aceita. Como no {@code LoginTests}, os
 * registros são gravados de verdade e limpos no fim.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class AceiteDosTermosTests {

	private static final String ROTA_LOGIN = "/api/autenticacao/login";

	private static final String EMAIL_DA_LIDIA = "lidia@casabelt.com";

	private static final String EMAIL_DESATIVADA = "desativada@casabelt.com";

	private static final String NAVEGADOR = "Navegador de teste";

	private static final String RESPOSTA_PENDENTE = """
			{"codigo":"TERMOS_PENDENTES",
			 "mensagem":"Para entrar, marque que você leu e concorda com os Termos de uso e a Política de privacidade."}""";

	private static final String RESPOSTA_GENERICA = """
			{"codigo":"CREDENCIAIS_INVALIDAS","mensagem":"E-mail ou senha incorretos."}""";

	private final JsonMapper json = JsonMapper.builder().build();

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private JdbcTemplate jdbc;

	@Autowired
	private PasswordEncoder codificadorDeSenha;

	@Autowired
	private ServicoToken servicoToken;

	@AfterEach
	void limpa() {
		jdbc.update("delete from aceite_termos");
		jdbc.update("delete from log_auditoria where acao in ('LOGIN_SUCESSO', 'LOGIN_FALHA', 'TERMOS_ACEITOS')");
		jdbc.update("delete from usuario where email = ?", EMAIL_DESATIVADA);
		jdbc.update("update usuario set ultimo_login_em = null where email = ?", EMAIL_DA_LIDIA);
	}

	@Test
	void devolveAVersaoVigenteSemToken() throws Exception {
		mockMvc.perform(get("/api/publico/termos"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.versao").value(1))
			.andExpect(jsonPath("$.data").value("2026-11-14"));
	}

	@Test
	void semOAceiteEComASenhaCertaPedeOsTermosSemEmitirToken() throws Exception {
		entrar(corpo(EMAIL_DA_LIDIA, TestcontainersConfiguration.SENHA_DA_LIDIA))
			.andExpect(status().isForbidden())
			.andExpect(content().json(RESPOSTA_PENDENTE, true))
			.andExpect(jsonPath("$.token").doesNotExist());

		assertThat(aceitesGravados()).isZero();
		assertThat(logs("LOGIN_SUCESSO")).isEmpty();
		assertThat(logs("TERMOS_ACEITOS")).isEmpty();
		assertThat(jdbc.queryForObject("select ultimo_login_em from usuario where email = ?", Object.class,
				EMAIL_DA_LIDIA))
			.isNull();
	}

	@Test
	void ocodigoPendenteSoApareceComASenhaCerta() throws Exception {
		// Senha errada, e-mail que não existe e usuária desativada continuam com a resposta de sempre
		entrar(corpo(EMAIL_DA_LIDIA, "Errada@123")).andExpect(status().isUnauthorized())
			.andExpect(content().json(RESPOSTA_GENERICA, true));
		entrar(corpo("ninguem@casabelt.com", TestcontainersConfiguration.SENHA_DA_LIDIA))
			.andExpect(status().isUnauthorized())
			.andExpect(content().json(RESPOSTA_GENERICA, true));

		jdbc.update("""
				insert into usuario (estabelecimento_id, nome, email, senha_hash, ativo)
				select id, 'Desativada', ?, ?, false from estabelecimento where slug = 'casa-belt'
				""", EMAIL_DESATIVADA, codificadorDeSenha.encode("Senha@123"));
		entrar(corpo(EMAIL_DESATIVADA, "Senha@123")).andExpect(status().isUnauthorized())
			.andExpect(content().json(RESPOSTA_GENERICA, true));

		assertThat(aceitesGravados()).isZero();
	}

	@Test
	void gravaOAceiteComVersaoDataIpENavegadorEOLogDeAuditoria() throws Exception {
		entrar(corpoComAceite(EMAIL_DA_LIDIA, TestcontainersConfiguration.SENHA_DA_LIDIA, 1))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.token").value(notNullValue()))
			.andExpect(jsonPath("$.termosAceitos.versao").value(1))
			.andExpect(jsonPath("$.termosAceitos.aceitoEm").value(notNullValue()));

		Map<String, Object> lidia = lidia();
		List<Map<String, Object>> aceites = jdbc.queryForList(
				"select id, usuario_id, versao, aceito_em, ip_origem, user_agent from aceite_termos");
		assertThat(aceites).singleElement().satisfies(aceite -> {
			assertThat(aceite).containsEntry("usuario_id", lidia.get("id"))
				.containsEntry("versao", 1)
				.containsEntry("ip_origem", "127.0.0.1")
				.containsEntry("user_agent", NAVEGADOR);
			assertThat(aceite.get("aceito_em")).isNotNull();
		});
		assertThat(logs("TERMOS_ACEITOS")).singleElement().satisfies(log -> assertThat(log)
			.containsEntry("usuario_id", lidia.get("id"))
			.containsEntry("estabelecimento_id", lidia.get("estabelecimento_id"))
			.containsEntry("entidade", "aceite_termos")
			.containsEntry("entidade_id", aceites.get(0).get("id"))
			.containsEntry("versao", "1")
			.containsEntry("ip_origem", "127.0.0.1")
			.containsEntry("user_agent", NAVEGADOR));
		assertThat(logs("LOGIN_SUCESSO")).hasSize(1);
	}

	@Test
	void noMesmoAparelhoNaoPedeDeNovoDepoisDoAceite() throws Exception {
		entrar(corpoComAceite(EMAIL_DA_LIDIA, TestcontainersConfiguration.SENHA_DA_LIDIA, 1))
			.andExpect(status().isOk());

		// O navegador lembra a versão aceita e manda só e-mail e senha: o servidor tem a prova
		entrar(corpo(EMAIL_DA_LIDIA, TestcontainersConfiguration.SENHA_DA_LIDIA))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.termosAceitos.versao").value(1));

		assertThat(aceitesGravados()).isEqualTo(1);
	}

	@Test
	void marcarDeNovoNaMesmaVersaoGravaOutroRegistro() throws Exception {
		entrar(corpoComAceite(EMAIL_DA_LIDIA, TestcontainersConfiguration.SENHA_DA_LIDIA, 1))
			.andExpect(status().isOk());
		entrar(corpoComAceite(EMAIL_DA_LIDIA, TestcontainersConfiguration.SENHA_DA_LIDIA, 1))
			.andExpect(status().isOk());

		assertThat(aceitesGravados()).isEqualTo(2);
		assertThat(logs("TERMOS_ACEITOS")).hasSize(2);
	}

	@Test
	void aceiteQueNaoEDaVersaoVigenteNaoValeENaoGrava() throws Exception {
		Map<String, Object> versaoErrada = corpoComAceite(EMAIL_DA_LIDIA, TestcontainersConfiguration.SENHA_DA_LIDIA, 99);
		Map<String, Object> semVersao = corpo(EMAIL_DA_LIDIA, TestcontainersConfiguration.SENHA_DA_LIDIA);
		semVersao.put("aceiteTermos", true);
		Map<String, Object> caixaVazia = corpoComAceite(EMAIL_DA_LIDIA, TestcontainersConfiguration.SENHA_DA_LIDIA, 1);
		caixaVazia.put("aceiteTermos", false);

		for (Map<String, Object> requisicao : List.of(versaoErrada, semVersao, caixaVazia)) {
			entrar(requisicao).andExpect(status().isForbidden())
				.andExpect(content().json(RESPOSTA_PENDENTE, true));
		}

		assertThat(aceitesGravados()).isZero();
		assertThat(logs("TERMOS_ACEITOS")).isEmpty();
	}

	@Test
	void devolveAVersaoAceitaDaUsuariaLogada() throws Exception {
		String corpoDoLogin = entrar(corpoComAceite(EMAIL_DA_LIDIA, TestcontainersConfiguration.SENHA_DA_LIDIA, 1))
			.andExpect(status().isOk())
			.andReturn().getResponse().getContentAsString();
		String token = (String) json.readValue(corpoDoLogin, Map.class).get("token");

		mockMvc.perform(get("/api/autenticacao/termos-aceitos").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.versao").value(1))
			.andExpect(jsonPath("$.aceitoEm").value(notNullValue()));
	}

	@Test
	void semAceiteNenhumAVersaoAceitaVemVazia() throws Exception {
		Map<String, Object> lidia = lidia();
		String token = servicoToken.gerar(new UsuarioAutenticado(((Number) lidia.get("id")).longValue(),
				((Number) lidia.get("estabelecimento_id")).longValue()));

		mockMvc.perform(get("/api/autenticacao/termos-aceitos").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
			.andExpect(status().isNoContent());
	}

	@Test
	void aVersaoAceitaExigeToken() throws Exception {
		mockMvc.perform(get("/api/autenticacao/termos-aceitos")).andExpect(status().isUnauthorized());
	}

	private ResultActions entrar(Map<String, Object> requisicao) throws Exception {
		return mockMvc.perform(post(ROTA_LOGIN).contentType(MediaType.APPLICATION_JSON)
			.header(HttpHeaders.USER_AGENT, NAVEGADOR)
			.content(json.writeValueAsString(requisicao)));
	}

	private static Map<String, Object> corpo(String email, String senha) {
		Map<String, Object> corpo = new HashMap<>();
		corpo.put("email", email);
		corpo.put("senha", senha);
		return corpo;
	}

	private static Map<String, Object> corpoComAceite(String email, String senha, int versao) {
		Map<String, Object> corpo = corpo(email, senha);
		corpo.put("aceiteTermos", true);
		corpo.put("versaoTermos", versao);
		return corpo;
	}

	private int aceitesGravados() {
		return jdbc.queryForObject("select count(*) from aceite_termos", Integer.class);
	}

	private Map<String, Object> lidia() {
		return jdbc.queryForMap("select id, estabelecimento_id from usuario where email = ?", EMAIL_DA_LIDIA);
	}

	private List<Map<String, Object>> logs(String acao) {
		return jdbc.queryForList("""
				select usuario_id, estabelecimento_id, entidade, entidade_id, ip_origem, user_agent,
				       detalhes ->> 'versao' as versao
				from log_auditoria where acao = ? order by id
				""", acao);
	}

}
