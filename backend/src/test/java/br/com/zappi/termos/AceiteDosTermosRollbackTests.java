package br.com.zappi.termos;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import java.util.Map;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.MockMvc;

import br.com.zappi.TestcontainersConfiguration;
import br.com.zappi.auditoria.RegistroAuditoria;
import br.com.zappi.auditoria.ServicoAuditoria;
import br.com.zappi.seguranca.ServicoToken;
import br.com.zappi.seguranca.UsuarioAutenticado;
import tools.jackson.databind.json.JsonMapper;

/**
 * O aceite dos termos, o log e o login são gravados na mesma transação (RN08): se o log ou o token
 * falharem, o aceite também é desfeito. O teste não usa transação própria, para ver o que de fato
 * ficou no banco.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class AceiteDosTermosRollbackTests {

	private final JsonMapper json = JsonMapper.builder().build();

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private JdbcTemplate jdbc;

	@MockitoSpyBean
	private ServicoAuditoria auditoria;

	@MockitoSpyBean
	private ServicoToken servicoToken;

	@AfterEach
	void limpa() {
		jdbc.update("delete from aceite_termos");
		jdbc.update("delete from log_auditoria where acao in ('LOGIN_SUCESSO', 'LOGIN_FALHA', 'TERMOS_ACEITOS')");
		jdbc.update("update usuario set ultimo_login_em = null where email = 'lidia@casabelt.com'");
	}

	@Test
	void desfazOAceiteSeOLogFalhar() {
		doThrow(new IllegalStateException("log fora do ar")).when(auditoria).registrar(any(RegistroAuditoria.class));

		assertThatThrownBy(this::entrarAceitando).hasRootCauseMessage("log fora do ar");

		nadaFoiGravado();
	}

	@Test
	void desfazOAceiteELogSeOTokenFalhar() {
		doThrow(new IllegalStateException("token fora do ar")).when(servicoToken).gerar(any(UsuarioAutenticado.class));

		assertThatThrownBy(this::entrarAceitando).hasRootCauseMessage("token fora do ar");

		nadaFoiGravado();
	}

	private void entrarAceitando() throws Exception {
		mockMvc.perform(post("/api/autenticacao/login").contentType(MediaType.APPLICATION_JSON)
			.content(json.writeValueAsString(Map.of("email", "lidia@casabelt.com", "senha",
					TestcontainersConfiguration.SENHA_DA_LIDIA, "aceiteTermos", true, "versaoTermos", 1))));
	}

	private void nadaFoiGravado() {
		assertThat(jdbc.queryForObject("select count(*) from aceite_termos", Integer.class)).isZero();
		assertThat(jdbc.queryForObject(
				"select count(*) from log_auditoria where acao in ('TERMOS_ACEITOS', 'LOGIN_SUCESSO')", Integer.class))
			.isZero();
		assertThat(jdbc.queryForObject("select ultimo_login_em from usuario where email = 'lidia@casabelt.com'",
				Object.class))
			.isNull();
	}

}
