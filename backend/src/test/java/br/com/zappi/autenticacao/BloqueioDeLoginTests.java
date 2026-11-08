package br.com.zappi.autenticacao;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Duration;
import java.time.OffsetDateTime;
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
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;

import br.com.zappi.TestcontainersConfiguration;
import tools.jackson.databind.json.JsonMapper;

/**
 * Bloqueio temporário do login (ZAP-85): 5 falhas em 15 minutos bloqueiam o e-mail.
 * Como no {@link LoginTests}, os registros são gravados de verdade e limpos no fim.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class BloqueioDeLoginTests {

	private static final String ROTA = "/api/autenticacao/login";

	private static final String EMAIL_DA_LIDIA = "lidia@casabelt.com";

	private static final String SENHA_ERRADA = "Errada@123";

	private static final String RESPOSTA_BLOQUEADO = """
			{"codigo":"LOGIN_BLOQUEADO",
			 "mensagem":"Muitas tentativas sem sucesso. Espere 15 minutos e tente novamente."}""";

	private final JsonMapper json = JsonMapper.builder().build();

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private JdbcTemplate jdbc;

	@AfterEach
	void limpa() {
		jdbc.update("delete from log_auditoria where acao in ('LOGIN_SUCESSO', 'LOGIN_FALHA')");
		jdbc.update("update usuario set ultimo_login_em = null where email = ?", EMAIL_DA_LIDIA);
	}

	@Test
	void quatroFalhasAindaDeixamEntrar() throws Exception {
		errar(EMAIL_DA_LIDIA, 4);

		entrar(EMAIL_DA_LIDIA, TestcontainersConfiguration.SENHA_DA_LIDIA).andExpect(status().isOk());
	}

	@Test
	void cincoFalhasBloqueiamMesmoComASenhaCerta() throws Exception {
		errar(EMAIL_DA_LIDIA, 5);

		MvcResult resultado = entrar(EMAIL_DA_LIDIA, TestcontainersConfiguration.SENHA_DA_LIDIA)
			.andExpect(status().isTooManyRequests())
			.andExpect(content().json(RESPOSTA_BLOQUEADO, true))
			.andReturn();
		long segundos = Long.parseLong(resultado.getResponse().getHeader(HttpHeaders.RETRY_AFTER));
		assertThat(segundos).isBetween(Duration.ofMinutes(14).toSeconds(), Duration.ofMinutes(15).toSeconds());
	}

	@Test
	void registraATentativaBloqueadaNoLog() throws Exception {
		errar(EMAIL_DA_LIDIA, 5);

		entrar(EMAIL_DA_LIDIA, TestcontainersConfiguration.SENHA_DA_LIDIA).andExpect(status().isTooManyRequests());

		Map<String, Object> ultimo = jdbc.queryForMap("""
				select acao, email_informado, usuario_id, detalhes ->> 'motivo' as motivo
				from log_auditoria order by id desc limit 1
				""");
		assertThat(ultimo).containsEntry("acao", "LOGIN_FALHA")
			.containsEntry("email_informado", EMAIL_DA_LIDIA)
			.containsEntry("motivo", "LOGIN_BLOQUEADO");
		assertThat(ultimo.get("usuario_id")).isNotNull();
	}

	@Test
	void liberaDepoisDeQuinzeMinutos() throws Exception {
		falhasAntigas(EMAIL_DA_LIDIA, 5, Duration.ofMinutes(16));

		entrar(EMAIL_DA_LIDIA, TestcontainersConfiguration.SENHA_DA_LIDIA).andExpect(status().isOk());
	}

	@Test
	void oLoginCertoZeraAContagem() throws Exception {
		errar(EMAIL_DA_LIDIA, 4);
		entrar(EMAIL_DA_LIDIA, TestcontainersConfiguration.SENHA_DA_LIDIA).andExpect(status().isOk());
		errar(EMAIL_DA_LIDIA, 4);

		entrar(EMAIL_DA_LIDIA, TestcontainersConfiguration.SENHA_DA_LIDIA).andExpect(status().isOk());
	}

	@Test
	void tentativasBloqueadasNaoProlongamOBloqueio() throws Exception {
		// As 5 falhas foram há 14 minutos: falta 1 minuto para liberar
		falhasAntigas(EMAIL_DA_LIDIA, 5, Duration.ofMinutes(14));
		entrar(EMAIL_DA_LIDIA, SENHA_ERRADA).andExpect(status().isTooManyRequests());
		entrar(EMAIL_DA_LIDIA, SENHA_ERRADA).andExpect(status().isTooManyRequests());

		MvcResult resultado = entrar(EMAIL_DA_LIDIA, SENHA_ERRADA)
			.andExpect(status().isTooManyRequests())
			.andReturn();
		assertThat(Long.parseLong(resultado.getResponse().getHeader(HttpHeaders.RETRY_AFTER))).isLessThanOrEqualTo(60);
	}

	@Test
	void bloqueiaEmailInexistenteDoMesmoJeito() throws Exception {
		errar("ninguem@casabelt.com", 5);

		entrar("ninguem@casabelt.com", SENHA_ERRADA)
			.andExpect(status().isTooManyRequests())
			.andExpect(content().json(RESPOSTA_BLOQUEADO, true));
	}

	@Test
	void contaAsFalhasSemDiferenciarMaiusculas() throws Exception {
		errar("LIDIA@casabelt.com", 3);
		errar(" Lidia@CasaBelt.com", 2);

		entrar(EMAIL_DA_LIDIA, TestcontainersConfiguration.SENHA_DA_LIDIA).andExpect(status().isTooManyRequests());
	}

	@Test
	void naoBloqueiaOutroEmail() throws Exception {
		errar("ninguem@casabelt.com", 5);

		entrar(EMAIL_DA_LIDIA, TestcontainersConfiguration.SENHA_DA_LIDIA).andExpect(status().isOk());
	}

	private void errar(String email, int vezes) throws Exception {
		for (int i = 0; i < vezes; i++) {
			entrar(email, SENHA_ERRADA).andExpect(status().isUnauthorized());
		}
	}

	/** Grava falhas como se tivessem acontecido há {@code atras}. */
	private void falhasAntigas(String email, int quantidade, Duration atras) {
		OffsetDateTime quando = OffsetDateTime.now().minus(atras);
		for (int i = 0; i < quantidade; i++) {
			jdbc.update("""
					insert into log_auditoria (acao, email_informado, detalhes, criado_em)
					values ('LOGIN_FALHA', ?, '{"motivo": "SENHA_INCORRETA"}'::jsonb, ?)
					""", email, quando.plusSeconds(i));
		}
	}

	private ResultActions entrar(String email, String senha) throws Exception {
		return mockMvc.perform(post(ROTA).contentType(MediaType.APPLICATION_JSON)
			.content(json.writeValueAsString(Map.of("email", email, "senha", senha))));
	}

}
